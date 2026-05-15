/**
 * Hebrew-RTL date formatting helpers, plus Israeli school-year helpers.
 * All functions operate on YYYY-MM-DD strings or Date objects and return
 * Hebrew strings suitable for direct display.
 */

import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { fromIsoDate } from './custody/dateUtils';

const WEEKDAYS_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'] as const;
const MONTHS_HE = [
  'ינואר',
  'פברואר',
  'מרץ',
  'אפריל',
  'מאי',
  'יוני',
  'יולי',
  'אוגוסט',
  'ספטמבר',
  'אוקטובר',
  'נובמבר',
  'דצמבר',
];

/** 'א׳ 21.4' — weekday prefix + day.month. */
export function formatDayShort(iso: string): string {
  const d = fromIsoDate(iso);
  return `${WEEKDAYS_HE[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}`;
}

/** 'א׳, 21 באפריל 2026' — full Hebrew long form. */
export function formatDayLong(iso: string): string {
  const d = fromIsoDate(iso);
  return `${WEEKDAYS_HE[d.getDay()]}, ${d.getDate()} ב${MONTHS_HE[d.getMonth()]} ${d.getFullYear()}`;
}

/** '21.4.2026' — 4-digit year, always unambiguous. */
export function formatDateWithYear(iso: string): string {
  const d = fromIsoDate(iso);
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}

/** '21.4 – 28.4' or '21.4 – 3.5.2026' when year differs. */
export function formatDateRange(startIso: string, endIso: string): string {
  const s = fromIsoDate(startIso);
  const e = fromIsoDate(endIso);
  const sameDay = startIso === endIso;
  if (sameDay) return formatDateWithYear(startIso);

  const sameYear = s.getFullYear() === e.getFullYear();
  const left = `${s.getDate()}.${s.getMonth() + 1}`;
  const right = sameYear
    ? `${e.getDate()}.${e.getMonth() + 1}`
    : `${e.getDate()}.${e.getMonth() + 1}.${e.getFullYear()}`;
  return `${left} – ${right}`;
}

/** Weekday label only, e.g. 'ראשון'. */
export function formatWeekday(iso: string, opts: { short?: boolean } = {}): string {
  const d = fromIsoDate(iso);
  const short = opts.short ?? false;
  if (short) return WEEKDAYS_HE[d.getDay()];
  return format(d, 'EEEE', { locale: he });
}

/**
 * Hebrew school-year label. '2026-2027' -> 'תשפ"ז'.
 * Uses a Gematria-based conversion for Hebrew year display. Works for years
 * 2024-2030 (תשפ"ד .. תש"ץ) via lookup; fallback is the Gregorian form.
 */
const HEBREW_YEAR_LABELS: Record<string, string> = {
  '2023-2024': 'תשפ"ד',
  '2024-2025': 'תשפ"ה',
  '2025-2026': 'תשפ"ו',
  '2026-2027': 'תשפ"ז',
  '2027-2028': 'תשפ"ח',
  '2028-2029': 'תשפ"ט',
  '2029-2030': 'תש"ץ',
  '2030-2031': 'תשצ"א',
  '2031-2032': 'תשצ"ב',
};

export function schoolYearLabelHebrew(schoolYear: string): string {
  return HEBREW_YEAR_LABELS[schoolYear] ?? schoolYear;
}

export function schoolYearLabelGregorian(schoolYear: string): string {
  return schoolYear;
}

/** The school year that contains this date. Israeli school-year: Sep 1 → Aug 31. */
export function schoolYearFor(iso: string): string {
  const d = fromIsoDate(iso);
  const y = d.getFullYear();
  const m = d.getMonth();
  const startYear = m >= 8 ? y : y - 1;
  return `${startYear}-${startYear + 1}`;
}
