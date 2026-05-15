// TypeScript types for the custody-schedule feature.
// Kept separate from the generated `types.ts` so migrations can evolve
// without re-running `supabase gen types` on every iteration.

export const EDUCATION_LEVELS = [
  'kindergarten',
  'elementary',
  'middle_school',
  'high_school',
] as const;
export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

export const EDUCATION_LABELS_HE: Record<EducationLevel, string> = {
  kindergarten: 'גן',
  elementary: 'יסודי',
  middle_school: 'חטיבת ביניים',
  high_school: 'תיכון',
};

export const EDUCATION_STREAMS = ['mamlachti', 'mamlachti_dati', 'haredi'] as const;
export type EducationStream = (typeof EDUCATION_STREAMS)[number];

// =============================================================================
// Presets
// =============================================================================

export const CUSTODY_PRESETS = [
  'week_on_week',
  'two_two_three',
  'sun_tue_alt_weekend',
  'mon_wed_alt_weekend',
  'weekdays_weekend',
  'alt_weekends_only',
  'three_four_four_three',
  'custom',
] as const;
export type CustodyPresetKey = (typeof CUSTODY_PRESETS)[number];

export const CUSTODY_PRESET_LABELS_HE: Record<CustodyPresetKey, string> = {
  week_on_week: 'שבוע-שבוע',
  two_two_three: '2-2-3',
  sun_tue_alt_weekend: 'א׳/ג׳ + סופ"ש לסירוגין',
  mon_wed_alt_weekend: 'ב׳/ד׳ + סופ"ש לסירוגין',
  weekdays_weekend: 'ימות השבוע / סופ"ש',
  alt_weekends_only: 'סופ"ש לסירוגין בלבד',
  three_four_four_three: '3-4-4-3',
  custom: 'מותאם אישית',
};

// Bitmask helpers: Sun=1, Mon=2, Tue=4, Wed=8, Thu=16, Fri=32, Sat=64.
export const WEEKDAY_BITS = {
  SUN: 1,
  MON: 2,
  TUE: 4,
  WED: 8,
  THU: 16,
  FRI: 32,
  SAT: 64,
} as const;
export const WEEKDAY_LABELS_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'] as const;

// =============================================================================
// Row shapes — mirror Postgres schemas in the Phase 1 migrations.
// =============================================================================

export interface CustodyPatternRow {
  id: string;
  account_id: string;
  owner_user_id: string;
  preset_key: CustodyPresetKey;
  label: string | null;
  weekday_mask_week1: number;
  weekday_mask_week2: number | null;
  dtstart: string; // YYYY-MM-DD
  until_date: string | null;
  handoff_time: string; // HH:MM:SS
  weekend_handoff_time: string | null;
  acts_as: string | null;
  created_at: string;
  updated_at: string;
}

export type CustodyExceptionKind =
  | 'holiday'
  | 'vacation'
  | 'swap'
  | 'one_off'
  | 'handoff_change';

export interface CustodyExceptionRow {
  id: string;
  account_id: string;
  kind: CustodyExceptionKind;
  event_name: string | null;
  parent_event: string | null;
  source_event_id: string | null;
  education_level: EducationLevel | null;
  claimed_by: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CustodyAgreementRow {
  id: string;
  account_id: string;
  version: number;
  confirmed_by: string[];
  last_proposal_by: string | null;
  last_proposal_at: string | null;
  last_proposal_payload: unknown | null;
  created_at: string;
  updated_at: string;
}

export type CustodyAuditTarget = 'pattern' | 'exception' | 'agreement';
export type CustodyAuditAction = 'insert' | 'update' | 'delete';

export interface CustodyAuditRow {
  id: number;
  account_id: string;
  actor_id: string | null;
  target: CustodyAuditTarget;
  target_id: string;
  action: CustodyAuditAction;
  diff: unknown;
  event_date: string | null;
  created_at: string;
}

// =============================================================================
// Proposals (Phase 5): conflict_resolution + swap + historical_edit
// =============================================================================

export type CustodyProposalKind =
  | 'conflict_resolution'
  | 'swap'
  | 'historical_edit';

export type CustodyProposalStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'superseded';

export interface ConflictResolutionPayload {
  kind: 'conflict_resolution';
  conflict_date: string; // YYYY-MM-DD
  winner_user_id: string;
  /** When the proposer offered a swap-back counter day. */
  swap_counter_date?: string | null;
}

export interface SwapPayload {
  kind: 'swap';
  from_date: string; // proposer's current day, goes to recipient
  to_date: string; // recipient's current day, goes to proposer
}

export interface HistoricalEditPayload {
  kind: 'historical_edit';
  date: string;
  /** Short human-readable description of what changed. */
  summary: string;
}

export type CustodyProposalPayload =
  | ConflictResolutionPayload
  | SwapPayload
  | HistoricalEditPayload;

export interface CustodyProposalRow {
  id: string;
  account_id: string;
  proposer_id: string;
  recipient_id: string;
  kind: CustodyProposalKind;
  payload: CustodyProposalPayload;
  note: string | null;
  status: CustodyProposalStatus;
  expires_at: string;
  decided_at: string | null;
  decided_by: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// School calendar
// =============================================================================

export type SchoolCalendarKind = 'holiday' | 'vacation' | 'irregular';
export type SchoolCalendarSource = 'hebcal' | 'mankal' | 'manual';

export interface SchoolCalendarEventRow {
  id: string;
  school_year: string;
  event_key: string;
  name_he: string;
  parent_event_key: string | null;
  start_date: string;
  end_date: string;
  kind: SchoolCalendarKind;
  applies_to: EducationLevel[];
  stream: EducationStream;
  source: SchoolCalendarSource;
  source_ref: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Domain types (derived / UI-facing)
// =============================================================================

export type DayOwner = 'A' | 'B' | 'both' | 'neither';
export type DaySlot = 'all' | 'AM' | 'PM';

export interface ResolvedDay {
  date: string; // YYYY-MM-DD
  owner: DayOwner;
  ownerUserId: string | null; // the concrete profile id when owner in {'A','B'}
  conflict: boolean;
  exceptionId: string | null; // if an exception overrides the base pattern
  exceptionKind: CustodyExceptionKind | null;
  eventName: string | null; // display name (e.g. 'סוכות')
  auditBadge: boolean; // true if there's a recent audit entry for this date
}

export interface PatternPreviewDay {
  date: string;
  ownerUserId: string | null;
}
