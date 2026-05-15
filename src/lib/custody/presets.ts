/**
 * Preset custody patterns — canonical source of truth for the 8 built-in
 * rotations. Each preset is defined by one or two weekday bitmasks: week 1
 * (mandatory) and week 2 (optional; present only for bi-weekly rotations).
 *
 * Bitmask convention: Sun=1, Mon=2, Tue=4, Wed=8, Thu=16, Fri=32, Sat=64.
 *
 * All masks describe the days that belong to the PATTERN OWNER (i.e. the
 * parent who saved this row). The "other parent" is the complement.
 */

import { WEEKDAY_BITS, type CustodyPresetKey } from '@/integrations/supabase/custodyTypes';

export interface PresetDefinition {
  key: CustodyPresetKey;
  labelHe: string;
  descriptionHe: string;
  /** Days the owner holds in week 1. */
  mask1: number;
  /** Days the owner holds in week 2. Null = single-week pattern (no alternation). */
  mask2: number | null;
  /** True when the preset requires the user to pick which week is "theirs" first. */
  hasBiWeeklyRotation: boolean;
  /** True when this is a fully custom pattern — the UI will render a grid. */
  isCustom: boolean;
}

const { SUN, MON, TUE, WED, THU, FRI, SAT } = WEEKDAY_BITS;

export const PRESET_CATALOG: Record<CustodyPresetKey, PresetDefinition> = {
  week_on_week: {
    key: 'week_on_week',
    labelHe: 'שבוע-שבוע',
    descriptionHe: 'שבוע שלם אצלך, שבוע שלם אצל ההורה השני.',
    mask1: SUN | MON | TUE | WED | THU | FRI | SAT,
    mask2: 0,
    hasBiWeeklyRotation: true,
    isCustom: false,
  },

  two_two_three: {
    key: 'two_two_three',
    labelHe: '2-2-3',
    descriptionHe: 'יומיים, יומיים, ושלושה ימים — מתחלף כל שבועיים.',
    // Week 1: Sun-Mon you + Fri-Sat you (2 + 2 = 4 days). Tue-Thu other parent (3).
    // Week 2: Sun-Mon other + Fri-Sat other. Tue-Thu you (3).
    mask1: SUN | MON | FRI | SAT,
    mask2: TUE | WED | THU,
    hasBiWeeklyRotation: true,
    isCustom: false,
  },

  sun_tue_alt_weekend: {
    key: 'sun_tue_alt_weekend',
    labelHe: 'א׳/ג׳ + סופ"ש לסירוגין',
    descriptionHe: 'ימי ראשון ושלישי קבועים איתך, סופי שבוע לסירוגין.',
    // Week 1: Sun, Tue + Fri, Sat
    // Week 2: Sun, Tue only (no weekend)
    mask1: SUN | TUE | FRI | SAT,
    mask2: SUN | TUE,
    hasBiWeeklyRotation: true,
    isCustom: false,
  },

  mon_wed_alt_weekend: {
    key: 'mon_wed_alt_weekend',
    labelHe: 'ב׳/ד׳ + סופ"ש לסירוגין',
    descriptionHe: 'ימי שני ורביעי קבועים איתך, סופי שבוע לסירוגין.',
    mask1: MON | WED | FRI | SAT,
    mask2: MON | WED,
    hasBiWeeklyRotation: true,
    isCustom: false,
  },

  weekdays_weekend: {
    key: 'weekdays_weekend',
    labelHe: 'ימות השבוע / סופ"ש',
    descriptionHe: 'ימי חול אצל אחד ההורים, סופ"ש אצל השני.',
    // Weekly pattern, no 2-week rotation. Owner defaults to weekdays.
    mask1: SUN | MON | TUE | WED | THU,
    mask2: null,
    hasBiWeeklyRotation: false,
    isCustom: false,
  },

  alt_weekends_only: {
    key: 'alt_weekends_only',
    labelHe: 'סופ"ש לסירוגין בלבד',
    descriptionHe: 'שאר השבוע משותף או ללא הגדרה. סופ"ש מתחלף.',
    mask1: FRI | SAT,
    mask2: 0,
    hasBiWeeklyRotation: true,
    isCustom: false,
  },

  three_four_four_three: {
    key: 'three_four_four_three',
    labelHe: '3-4-4-3',
    descriptionHe: 'שלושה-ארבעה-ארבעה-שלושה. רוטציה שבועיים.',
    // Week 1: Sun-Tue you (3), Wed-Sat other (4)
    // Week 2: Sun-Wed you (4), Thu-Sat other (3)
    mask1: SUN | MON | TUE,
    mask2: SUN | MON | TUE | WED,
    hasBiWeeklyRotation: true,
    isCustom: false,
  },

  custom: {
    key: 'custom',
    labelHe: 'מותאם אישית',
    descriptionHe: 'סמנ/י בעצמך אילו ימים שלך.',
    mask1: 0,
    mask2: null,
    hasBiWeeklyRotation: false,
    isCustom: true,
  },
};

export const PRESET_ORDER: CustodyPresetKey[] = [
  'week_on_week',
  'two_two_three',
  'sun_tue_alt_weekend',
  'mon_wed_alt_weekend',
  'weekdays_weekend',
  'alt_weekends_only',
  'three_four_four_three',
  'custom',
];

/**
 * Bitmask helpers. Weekdays are indexed Sun=0 .. Sat=6 (matches JavaScript's
 * Date.getDay()).
 */
export function maskHasDay(mask: number, weekdayIndex: number): boolean {
  return (mask & (1 << weekdayIndex)) !== 0;
}

export function maskSetDay(mask: number, weekdayIndex: number, on: boolean): number {
  const bit = 1 << weekdayIndex;
  return on ? mask | bit : mask & ~bit;
}

export function maskToDayIndices(mask: number): number[] {
  const days: number[] = [];
  for (let i = 0; i < 7; i++) if (maskHasDay(mask, i)) days.push(i);
  return days;
}

export function maskCount(mask: number): number {
  let n = mask;
  let count = 0;
  while (n) {
    n &= n - 1;
    count++;
  }
  return count;
}
