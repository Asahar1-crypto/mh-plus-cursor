import { supabase } from './client';
import type {
  CustodyAgreementRow,
  CustodyAuditRow,
  CustodyExceptionKind,
  CustodyExceptionRow,
  CustodyPatternRow,
  CustodyPresetKey,
  EducationLevel,
} from './custodyTypes';

// =============================================================================
// NEW API — split services for patterns, exceptions, agreements, audit.
// =============================================================================
// The legacy `custodyService` export (bottom of the file) is a thin shim that
// preserves the old read/write surface until the custody UI is refactored in
// Phase 4. New callers should use the split services below.

// -----------------------------------------------------------------------------
// Patterns
// -----------------------------------------------------------------------------

export interface UpsertPatternInput {
  accountId: string;
  ownerUserId: string;
  presetKey: CustodyPresetKey;
  label?: string | null;
  weekdayMaskWeek1: number;
  weekdayMaskWeek2?: number | null;
  dtstart: string;
  untilDate?: string | null;
  handoffTime?: string;
  weekendHandoffTime?: string | null;
  actsAs?: string | null;
}

export const custodyPatternService = {
  async listByAccount(accountId: string): Promise<CustodyPatternRow[]> {
    const { data, error } = await supabase
      .from('custody_patterns')
      .select('*')
      .eq('account_id', accountId);
    if (error) throw error;
    return (data ?? []) as CustodyPatternRow[];
  },

  async getMine(accountId: string, userId: string): Promise<CustodyPatternRow | null> {
    const { data, error } = await supabase
      .from('custody_patterns')
      .select('*')
      .eq('account_id', accountId)
      .eq('owner_user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as CustodyPatternRow | null;
  },

  async upsert(input: UpsertPatternInput): Promise<CustodyPatternRow> {
    const row = {
      account_id: input.accountId,
      owner_user_id: input.ownerUserId,
      preset_key: input.presetKey,
      label: input.label ?? null,
      weekday_mask_week1: input.weekdayMaskWeek1,
      weekday_mask_week2: input.weekdayMaskWeek2 ?? null,
      dtstart: input.dtstart,
      until_date: input.untilDate ?? null,
      handoff_time: input.handoffTime ?? '18:00',
      weekend_handoff_time: input.weekendHandoffTime ?? null,
      acts_as: input.actsAs ?? null,
    };
    const { data, error } = await supabase
      .from('custody_patterns')
      .upsert(row, { onConflict: 'account_id,owner_user_id' })
      .select()
      .single();
    if (error) throw error;
    return data as CustodyPatternRow;
  },

  async remove(patternId: string, accountId: string): Promise<void> {
    const { error } = await supabase
      .from('custody_patterns')
      .delete()
      .eq('id', patternId)
      .eq('account_id', accountId);
    if (error) throw error;
  },
};

// -----------------------------------------------------------------------------
// Exceptions
// -----------------------------------------------------------------------------

export interface ListExceptionsInput {
  accountId: string;
  from?: string;
  to?: string;
  kinds?: CustodyExceptionKind[];
}

export interface UpsertExceptionInput {
  id?: string;
  accountId: string;
  kind: CustodyExceptionKind;
  eventName?: string | null;
  parentEvent?: string | null;
  sourceEventId?: string | null;
  educationLevel?: EducationLevel | null;
  claimedBy?: string | null;
  startDate: string;
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
  notes?: string | null;
  createdBy: string;
}

export const custodyExceptionService = {
  async list(input: ListExceptionsInput): Promise<CustodyExceptionRow[]> {
    let query = supabase
      .from('custody_exceptions')
      .select('*')
      .eq('account_id', input.accountId)
      .order('start_date', { ascending: true });
    if (input.from) query = query.gte('end_date', input.from);
    if (input.to) query = query.lte('start_date', input.to);
    if (input.kinds && input.kinds.length > 0) query = query.in('kind', input.kinds);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as CustodyExceptionRow[];
  },

  async upsert(input: UpsertExceptionInput): Promise<CustodyExceptionRow> {
    const row = {
      id: input.id,
      account_id: input.accountId,
      kind: input.kind,
      event_name: input.eventName ?? null,
      parent_event: input.parentEvent ?? null,
      source_event_id: input.sourceEventId ?? null,
      education_level: input.educationLevel ?? null,
      claimed_by: input.claimedBy ?? null,
      start_date: input.startDate,
      end_date: input.endDate,
      start_time: input.startTime ?? null,
      end_time: input.endTime ?? null,
      notes: input.notes ?? null,
      created_by: input.createdBy,
    };

    if (input.id) {
      const { data, error } = await supabase
        .from('custody_exceptions')
        .update(row)
        .eq('id', input.id)
        .eq('account_id', input.accountId)
        .select()
        .single();
      if (error) throw error;
      return data as CustodyExceptionRow;
    }

    const { data, error } = await supabase
      .from('custody_exceptions')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return data as CustodyExceptionRow;
  },

  async bulkInsert(
    accountId: string,
    createdBy: string,
    rows: Omit<UpsertExceptionInput, 'accountId' | 'createdBy'>[],
  ): Promise<number> {
    if (rows.length === 0) return 0;
    const payload = rows.map((r) => ({
      account_id: accountId,
      kind: r.kind,
      event_name: r.eventName ?? null,
      parent_event: r.parentEvent ?? null,
      source_event_id: r.sourceEventId ?? null,
      education_level: r.educationLevel ?? null,
      claimed_by: r.claimedBy ?? null,
      start_date: r.startDate,
      end_date: r.endDate,
      start_time: r.startTime ?? null,
      end_time: r.endTime ?? null,
      notes: r.notes ?? null,
      created_by: createdBy,
    }));
    const { error } = await supabase.from('custody_exceptions').insert(payload);
    if (error) throw error;
    return payload.length;
  },

  async remove(exceptionId: string, accountId: string): Promise<void> {
    const { error } = await supabase
      .from('custody_exceptions')
      .delete()
      .eq('id', exceptionId)
      .eq('account_id', accountId);
    if (error) throw error;
  },

  async updateClaimedBy(
    exceptionId: string,
    accountId: string,
    claimedBy: string | null,
  ): Promise<void> {
    const { error } = await supabase
      .from('custody_exceptions')
      .update({ claimed_by: claimedBy })
      .eq('id', exceptionId)
      .eq('account_id', accountId);
    if (error) throw error;
  },

  async updateNotes(exceptionId: string, accountId: string, notes: string): Promise<void> {
    const { error } = await supabase
      .from('custody_exceptions')
      .update({ notes })
      .eq('id', exceptionId)
      .eq('account_id', accountId);
    if (error) throw error;
  },
};

// -----------------------------------------------------------------------------
// Agreements
// -----------------------------------------------------------------------------

export const custodyAgreementService = {
  async get(accountId: string): Promise<CustodyAgreementRow | null> {
    const { data, error } = await supabase
      .from('custody_agreements')
      .select('*')
      .eq('account_id', accountId)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as CustodyAgreementRow | null;
  },

  async proposeChange(
    accountId: string,
    proposedBy: string,
    payload: unknown,
  ): Promise<CustodyAgreementRow> {
    const existing = await this.get(accountId);
    const newVersion = (existing?.version ?? 0) + 1;
    const row = {
      account_id: accountId,
      version: newVersion,
      confirmed_by: [proposedBy],
      last_proposal_by: proposedBy,
      last_proposal_at: new Date().toISOString(),
      last_proposal_payload: payload as object,
    };
    const { data, error } = await supabase
      .from('custody_agreements')
      .upsert(row, { onConflict: 'account_id' })
      .select()
      .single();
    if (error) throw error;
    return data as CustodyAgreementRow;
  },

  async confirm(accountId: string, userId: string): Promise<CustodyAgreementRow> {
    const existing = await this.get(accountId);
    if (!existing) throw new Error('No agreement to confirm');
    if (existing.confirmed_by.includes(userId)) return existing;
    const confirmed = [...existing.confirmed_by, userId];
    const { data, error } = await supabase
      .from('custody_agreements')
      .update({ confirmed_by: confirmed })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as CustodyAgreementRow;
  },
};

// -----------------------------------------------------------------------------
// Audit (read-only from the client)
// -----------------------------------------------------------------------------

export interface ListAuditInput {
  accountId: string;
  target?: CustodyAuditRow['target'];
  since?: string; // ISO timestamp
  limit?: number;
}

export const custodyAuditService = {
  async list(input: ListAuditInput): Promise<CustodyAuditRow[]> {
    let query = supabase
      .from('custody_audit')
      .select('*')
      .eq('account_id', input.accountId)
      .order('created_at', { ascending: false })
      .limit(input.limit ?? 100);
    if (input.target) query = query.eq('target', input.target);
    if (input.since) query = query.gte('created_at', input.since);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as CustodyAuditRow[];
  },

  async forEventDates(
    accountId: string,
    eventDates: string[],
  ): Promise<Record<string, CustodyAuditRow[]>> {
    if (eventDates.length === 0) return {};
    const { data, error } = await supabase
      .from('custody_audit')
      .select('*')
      .eq('account_id', accountId)
      .in('event_date', eventDates)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const grouped: Record<string, CustodyAuditRow[]> = {};
    for (const row of (data ?? []) as CustodyAuditRow[]) {
      const key = row.event_date;
      if (!key) continue;
      (grouped[key] ||= []).push(row);
    }
    return grouped;
  },
};

// =============================================================================
// LEGACY SHIM — kept so the pre-refactor custody UI (CustodyTable,
// CustodyCalendar, useCustodyAssignments, LoadVacationsButton, CustodySummary)
// keeps compiling until it's replaced in Phase 4.
// Reads go through the `custody_assignments` compat view; writes go straight
// to `custody_exceptions`.
// =============================================================================

/** @deprecated Use CustodyExceptionRow. Kept for legacy consumers. */
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

/** @deprecated Used by the old AI-powered loader flow. */
export interface HolidayItem {
  name: string;
  start_date: string;
  end_date: string;
  type: 'holiday' | 'vacation';
  parent_name?: string | null;
}

/** @deprecated Use custodyService from the split service objects above. */
export const custodyService = {
  async getAssignments(accountId: string): Promise<CustodyAssignment[]> {
    const { data, error } = await supabase
      .from('custody_assignments')
      .select(`*, assigned_parent:profiles!assigned_parent_id(name)`)
      .eq('account_id', accountId)
      .order('start_date', { ascending: true });
    if (error) throw error;
    return (data ?? []) as CustodyAssignment[];
  },

  async fetchHolidaysFromAI(
    _type: 'holidays' | 'vacations',
    _schoolYear: string,
    _accountId: string,
    _educationLevel?: EducationLevel,
  ): Promise<HolidayItem[]> {
    throw new Error(
      'fetchHolidaysFromAI was removed. Use schoolCalendarService.list({ schoolYear }).',
    );
  },

  async addAssignments(
    accountId: string,
    userId: string,
    items: HolidayItem[],
    _schoolYear: string,
    educationLevel?: EducationLevel,
  ): Promise<{ added: number; skipped: number }> {
    if (items.length === 0) return { added: 0, skipped: 0 };
    const rows = items.map((item) => ({
      account_id: accountId,
      kind: item.type as CustodyExceptionKind,
      event_name: item.name,
      parent_event: item.parent_name ?? null,
      education_level: item.type === 'vacation' ? (educationLevel ?? null) : null,
      start_date: item.start_date,
      end_date: item.end_date,
      created_by: userId,
    }));
    const { error } = await supabase.from('custody_exceptions').insert(rows);
    if (error) throw error;
    return { added: items.length, skipped: 0 };
  },

  async updateParent(
    assignmentId: string,
    accountId: string,
    parentId: string | null,
  ): Promise<void> {
    const { error } = await supabase
      .from('custody_exceptions')
      .update({ claimed_by: parentId })
      .eq('id', assignmentId)
      .eq('account_id', accountId);
    if (error) throw error;
  },

  async updateNotes(assignmentId: string, accountId: string, notes: string): Promise<void> {
    const { error } = await supabase
      .from('custody_exceptions')
      .update({ notes })
      .eq('id', assignmentId)
      .eq('account_id', accountId);
    if (error) throw error;
  },

  async deleteAssignment(assignmentId: string, accountId: string): Promise<void> {
    const { error } = await supabase
      .from('custody_exceptions')
      .delete()
      .eq('id', assignmentId)
      .eq('account_id', accountId);
    if (error) throw error;
  },

  async bulkAssignParent(
    assignmentIds: string[],
    accountId: string,
    parentId: string | null,
  ): Promise<void> {
    const { error } = await supabase
      .from('custody_exceptions')
      .update({ claimed_by: parentId })
      .in('id', assignmentIds)
      .eq('account_id', accountId);
    if (error) throw error;
  },
};
