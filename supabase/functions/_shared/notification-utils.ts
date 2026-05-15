/**
 * Notification utility functions shared across edge functions
 */

const ISRAEL_TZ = 'Asia/Jerusalem';

/**
 * Notification types that bypass quiet hours (always delivered immediately).
 * Keep this list narrow — every type here can wake the user at 3am.
 */
export const URGENT_NOTIFICATION_TYPES = [
  'expense_pending_approval',
  'invitation_received',
  'budget_exceeded',
] as const;

export type NotificationType = string;

export interface QuietHoursPrefs {
  quiet_hours_enabled?: boolean | null;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
}

/**
 * Parse "HH:MM" or "HH:MM:SS" into minutes-since-midnight.
 * Returns NaN for unparseable input — caller treats NaN as "not in quiet hours" (fail-open).
 */
function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
  return h * 60 + m;
}

/**
 * Returns true when `current` falls inside the [start, end) quiet-hours window.
 * Handles same-day (09:00–17:00) and cross-midnight (22:00–07:00) windows.
 * Accepts both "HH:MM" and "HH:MM:SS" — seconds are ignored.
 */
export function isInQuietHours(
  current: string,
  start: string,
  end: string,
): boolean {
  const cur = timeToMinutes(current);
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (Number.isNaN(cur) || Number.isNaN(s) || Number.isNaN(e)) return false;
  if (s === e) return false; // zero-length window
  if (s < e) return cur >= s && cur < e;
  return cur >= s || cur < e;
}

/**
 * Current local time in Israel as "HH:MM". DST-aware via Intl.
 */
export function getCurrentIsraelTimeHHMM(): string {
  return new Intl.DateTimeFormat('he-IL', {
    timeZone: ISRAEL_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

/**
 * Single source of truth for "should this notification be suppressed for quiet hours?".
 * Returns true => caller should skip delivery for this channel.
 * Urgent types and disabled quiet-hours both yield false.
 */
export function shouldSuppressForQuietHours(
  prefs: QuietHoursPrefs | null | undefined,
  notificationType: NotificationType,
): boolean {
  if (!prefs?.quiet_hours_enabled) return false;
  if ((URGENT_NOTIFICATION_TYPES as readonly string[]).includes(notificationType)) {
    return false;
  }
  if (!prefs.quiet_hours_start || !prefs.quiet_hours_end) return false;
  return isInQuietHours(
    getCurrentIsraelTimeHHMM(),
    prefs.quiet_hours_start,
    prefs.quiet_hours_end,
  );
}

/**
 * Validate a notification type string
 */
export function isValidNotificationType(type: string): boolean {
  const validTypes = [
    'expense_pending_approval',
    'expense_approved',
    'expense_rejected',
    'expense_paid',
    'budget_threshold_75',
    'budget_threshold_90',
    'budget_exceeded',
    'monthly_settlement_ready',
    'invitation_received',
    'recurring_expense_created',
    'payment_due',
    'subscription_expiring',
    'new_family_member',
    'account_activity',
  ];
  return validTypes.includes(type);
}
