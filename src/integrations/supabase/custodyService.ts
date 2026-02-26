import { supabase } from './client';

export interface CustodyAssignment {
  id: string;
  account_id: string;
  event_name: string;
  event_type: 'holiday' | 'vacation';
  education_level: string | null;
  start_date: string;
  end_date: string;
  assigned_parent_id: string | null;
  parent_event: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  assigned_parent?: { name: string } | null;
}

export interface HolidayItem {
  name: string;
  start_date: string;
  end_date: string;
  type: 'holiday' | 'vacation';
  parent_name?: string | null;
}

export type EducationLevel = 'kindergarten' | 'elementary' | 'middle_school' | 'high_school';

export const custodyService = {
  async getAssignments(accountId: string): Promise<CustodyAssignment[]> {
    const { data, error } = await supabase
      .from('custody_assignments')
      .select(`
        *,
        assigned_parent:profiles!assigned_parent_id(name)
      `)
      .eq('account_id', accountId)
      .order('start_date', { ascending: true });

    if (error) {
      console.error('Error fetching custody assignments:', error);
      throw error;
    }

    return (data || []) as CustodyAssignment[];
  },

  async fetchHolidaysFromAI(
    type: 'holidays' | 'vacations',
    schoolYear: string,
    accountId: string,
    educationLevel?: EducationLevel
  ): Promise<HolidayItem[]> {
    const { data, error } = await supabase.functions.invoke('fetch-holidays', {
      body: {
        type,
        education_level: educationLevel || null,
        school_year: schoolYear,
        account_id: accountId,
      },
    });

    if (error) {
      console.error('Error fetching holidays from AI:', error);
      throw new Error('שגיאה בשליפת נתונים');
    }

    if (!data?.success) {
      throw new Error(data?.error || 'שגיאה לא צפויה');
    }

    return data.items as HolidayItem[];
  },

  async addAssignments(
    accountId: string,
    userId: string,
    items: HolidayItem[],
    schoolYear: string,
    educationLevel?: EducationLevel
  ): Promise<{ added: number; skipped: number }> {
    if (items.length === 0) return { added: 0, skipped: 0 };

    const eventType = items[0].type;
    const [startYear] = schoolYear.split('-').map(Number);
    const periodStart = `${startYear}-08-01`;
    const periodEnd = `${startYear + 1}-09-01`;

    let deleteQuery = supabase
      .from('custody_assignments')
      .delete()
      .eq('account_id', accountId)
      .eq('event_type', eventType)
      .gte('start_date', periodStart)
      .lt('start_date', periodEnd);

    if (eventType === 'vacation' && educationLevel) {
      deleteQuery = deleteQuery.eq('education_level', educationLevel);
    }

    const { error: deleteError } = await deleteQuery;
    if (deleteError) {
      console.error('Error deleting old assignments:', deleteError);
      throw deleteError;
    }

    const rows = items.map((item) => ({
      account_id: accountId,
      event_name: item.name,
      event_type: item.type,
      education_level: item.type === 'vacation' ? (educationLevel || null) : null,
      start_date: item.start_date,
      end_date: item.end_date,
      parent_event: item.parent_name || null,
      created_by: userId,
    }));

    const { error } = await supabase
      .from('custody_assignments')
      .insert(rows);

    if (error) {
      console.error('Error inserting custody assignments:', error);
      throw error;
    }

    return { added: items.length, skipped: 0 };
  },

  async updateParent(
    assignmentId: string,
    parentId: string | null
  ): Promise<void> {
    const { error } = await supabase
      .from('custody_assignments')
      .update({
        assigned_parent_id: parentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignmentId);

    if (error) {
      console.error('Error updating parent assignment:', error);
      throw error;
    }
  },

  async updateNotes(assignmentId: string, notes: string): Promise<void> {
    const { error } = await supabase
      .from('custody_assignments')
      .update({
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignmentId);

    if (error) {
      console.error('Error updating notes:', error);
      throw error;
    }
  },

  async deleteAssignment(assignmentId: string): Promise<void> {
    const { error } = await supabase
      .from('custody_assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) {
      console.error('Error deleting assignment:', error);
      throw error;
    }
  },

  async bulkAssignParent(
    assignmentIds: string[],
    parentId: string | null
  ): Promise<void> {
    const { error } = await supabase
      .from('custody_assignments')
      .update({
        assigned_parent_id: parentId,
        updated_at: new Date().toISOString(),
      })
      .in('id', assignmentIds);

    if (error) {
      console.error('Error bulk updating parent:', error);
      throw error;
    }
  },
};
