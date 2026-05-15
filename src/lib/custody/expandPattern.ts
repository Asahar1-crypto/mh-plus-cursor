/**
 * Pattern expansion — transforms a custody_patterns row into a per-day
 * ownership map over a given date range.
 *
 * Input: a parent's pattern.
 * Output: for each date in [rangeFrom..rangeTo], is this date an "owner day"
 * for the pattern owner?
 */

import type { CustodyPatternRow } from '@/integrations/supabase/custodyTypes';
import { biWeeklyPhase, enumerateDates, weekdayIndex } from './dateUtils';
import { maskHasDay } from './presets';

export interface PatternDay {
  date: string;
  isOwnerDay: boolean;
}

/**
 * Expand a single pattern across the date range.
 * - Dates before `dtstart` or after `until_date` return isOwnerDay=false.
 * - Bi-weekly patterns use dtstart to align week parity.
 */
export function expandPattern(
  pattern: CustodyPatternRow,
  rangeFromIso: string,
  rangeToIso: string,
): PatternDay[] {
  const out: PatternDay[] = [];
  const dates = enumerateDates(rangeFromIso, rangeToIso);

  const hasBiWeekly = pattern.weekday_mask_week2 !== null;
  const mask1 = pattern.weekday_mask_week1;
  const mask2 = pattern.weekday_mask_week2 ?? 0;

  for (const iso of dates) {
    if (iso < pattern.dtstart) {
      out.push({ date: iso, isOwnerDay: false });
      continue;
    }
    if (pattern.until_date && iso > pattern.until_date) {
      out.push({ date: iso, isOwnerDay: false });
      continue;
    }
    const wd = weekdayIndex(iso);
    const mask = hasBiWeekly
      ? biWeeklyPhase(iso, pattern.dtstart) === 0
        ? mask1
        : mask2
      : mask1;
    out.push({ date: iso, isOwnerDay: maskHasDay(mask, wd) });
  }

  return out;
}

/**
 * Convenience: convert a list of PatternDay into a Set of owner dates.
 */
export function ownerDatesSet(days: PatternDay[]): Set<string> {
  const s = new Set<string>();
  for (const d of days) if (d.isOwnerDay) s.add(d.date);
  return s;
}
