import { supabase } from './client';
import type {
  EducationLevel,
  EducationStream,
  SchoolCalendarEventRow,
  SchoolCalendarKind,
  SchoolCalendarSource,
} from './custodyTypes';

export interface ListEventsInput {
  schoolYear?: string;
  appliesTo?: EducationLevel;
  stream?: EducationStream;
  kinds?: SchoolCalendarKind[];
  from?: string;
  to?: string;
}

export interface UpsertEventInput {
  id?: string;
  schoolYear: string;
  eventKey: string;
  nameHe: string;
  parentEventKey?: string | null;
  startDate: string;
  endDate: string;
  kind: SchoolCalendarKind;
  appliesTo: EducationLevel[];
  stream?: EducationStream;
  source: SchoolCalendarSource;
  sourceRef?: string | null;
}

/**
 * Returns the Israeli school year identifier for a given date.
 * School years run Sep 1 -> Aug 31. Example: 2026-09-15 -> '2026-2027'.
 */
export function schoolYearFor(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth();
  const startYear = m >= 8 ? y : y - 1;
  return `${startYear}-${startYear + 1}`;
}

export const schoolCalendarService = {
  async list(input: ListEventsInput = {}): Promise<SchoolCalendarEventRow[]> {
    let query = supabase
      .from('school_calendar_events')
      .select('*')
      .order('start_date', { ascending: true });

    if (input.schoolYear) query = query.eq('school_year', input.schoolYear);
    if (input.stream) query = query.eq('stream', input.stream);
    if (input.kinds && input.kinds.length > 0) query = query.in('kind', input.kinds);
    if (input.from) query = query.gte('end_date', input.from);
    if (input.to) query = query.lte('start_date', input.to);
    if (input.appliesTo) query = query.contains('applies_to', [input.appliesTo]);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as SchoolCalendarEventRow[];
  },

  async listYears(): Promise<string[]> {
    const { data, error } = await supabase
      .from('school_calendar_events')
      .select('school_year')
      .order('school_year', { ascending: false });
    if (error) throw error;
    const years = new Set<string>();
    for (const row of (data ?? []) as { school_year: string }[]) years.add(row.school_year);
    return Array.from(years);
  },

  async upsert(input: UpsertEventInput): Promise<SchoolCalendarEventRow> {
    const row = {
      id: input.id,
      school_year: input.schoolYear,
      event_key: input.eventKey,
      name_he: input.nameHe,
      parent_event_key: input.parentEventKey ?? null,
      start_date: input.startDate,
      end_date: input.endDate,
      kind: input.kind,
      applies_to: input.appliesTo,
      stream: input.stream ?? 'mamlachti',
      source: input.source,
      source_ref: input.sourceRef ?? null,
    };

    if (input.id) {
      const { data, error } = await supabase
        .from('school_calendar_events')
        .update(row)
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data as SchoolCalendarEventRow;
    }

    const { data, error } = await supabase
      .from('school_calendar_events')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return data as SchoolCalendarEventRow;
  },

  async bulkUpsert(rows: UpsertEventInput[]): Promise<number> {
    if (rows.length === 0) return 0;
    const payload = rows.map((r) => ({
      school_year: r.schoolYear,
      event_key: r.eventKey,
      name_he: r.nameHe,
      parent_event_key: r.parentEventKey ?? null,
      start_date: r.startDate,
      end_date: r.endDate,
      kind: r.kind,
      applies_to: r.appliesTo,
      stream: r.stream ?? 'mamlachti',
      source: r.source,
      source_ref: r.sourceRef ?? null,
    }));
    const { error } = await supabase
      .from('school_calendar_events')
      .upsert(payload, { onConflict: 'school_year,event_key,start_date,stream' });
    if (error) throw error;
    return payload.length;
  },

  async verify(id: string, verifiedBy: string): Promise<void> {
    const { error } = await supabase
      .from('school_calendar_events')
      .update({
        verified_by: verifiedBy,
        verified_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('school_calendar_events')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async importYearFromHebcal(schoolYear: string): Promise<{ imported: number }> {
    const { data, error } = await supabase.functions.invoke('fetch-holidays', {
      body: { action: 'import_year', school_year: schoolYear },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error ?? 'שגיאה בייבוא');
    return { imported: data.imported ?? 0 };
  },
};
