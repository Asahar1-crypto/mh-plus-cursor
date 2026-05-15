/**
 * Timezone-safe date utilities for the custody feature. All dates in the
 * system are stored as YYYY-MM-DD strings and represent a local Asia/Jerusalem
 * day. We intentionally avoid `Date.toISOString()` + slice (which converts to
 * UTC) and always construct strings from local components.
 */

/** Format a Date as YYYY-MM-DD using its local components. */
export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse a YYYY-MM-DD string into a Date at local midnight. */
export function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

export function addIsoDays(iso: string, days: number): string {
  return toIsoDate(addDays(fromIsoDate(iso), days));
}

/**
 * Integer count of whole days between two local dates (exclusive of the
 * start, inclusive of the end). Handles DST transitions by normalizing to
 * noon before differencing — adding 12 hours of slack on either side.
 */
export function daysBetween(a: Date, b: Date): number {
  const aN = new Date(a.getFullYear(), a.getMonth(), a.getDate(), 12, 0, 0);
  const bN = new Date(b.getFullYear(), b.getMonth(), b.getDate(), 12, 0, 0);
  return Math.round((bN.getTime() - aN.getTime()) / 86_400_000);
}

/** Count inclusive days in a date range (both ends included). */
export function inclusiveDayCount(startIso: string, endIso: string): number {
  return daysBetween(fromIsoDate(startIso), fromIsoDate(endIso)) + 1;
}

/**
 * All YYYY-MM-DD strings in [startIso..endIso] inclusive. Empty array if
 * endIso < startIso.
 */
export function enumerateDates(startIso: string, endIso: string): string[] {
  if (endIso < startIso) return [];
  const out: string[] = [];
  let cur = fromIsoDate(startIso);
  const end = fromIsoDate(endIso);
  while (cur.getTime() <= end.getTime()) {
    out.push(toIsoDate(cur));
    cur = addDays(cur, 1);
  }
  return out;
}

/** JavaScript Date.getDay(): Sun=0 .. Sat=6. */
export function weekdayIndex(iso: string): number {
  return fromIsoDate(iso).getDay();
}

/**
 * Week index in the 2-week alternation, phased to dtstart.
 * Returns 0 for week 1 (same parity as dtstart), 1 for week 2.
 */
export function biWeeklyPhase(iso: string, dtstartIso: string): 0 | 1 {
  const d = fromIsoDate(iso);
  const anchor = fromIsoDate(dtstartIso);
  // Normalize both to the Sunday that starts their week to avoid cross-week
  // drift due to dtstart landing mid-week.
  const dSun = addDays(d, -d.getDay());
  const aSun = addDays(anchor, -anchor.getDay());
  const weeks = daysBetween(aSun, dSun) / 7;
  return (Math.floor(Math.abs(weeks)) % 2) as 0 | 1;
}
