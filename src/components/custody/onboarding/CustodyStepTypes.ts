import type { CustodyPresetKey } from '@/integrations/supabase/custodyTypes';
import type { DaySlotState } from '../shared/WeekGridInput';

/**
 * Shared state for the CustodyStep sub-wizard (A1–A6).
 * Lives in CustodyStep.tsx and is threaded to each sub-screen.
 */
export interface CustodyStepState {
  preset: CustodyPresetKey | null;
  /** 7-day state for the custom grid (A2). Only used when preset === 'custom'. */
  customWeek: DaySlotState[];
  /** One of '14:00' | '18:00' | <arbitrary HH:MM>. */
  handoffTime: string;
  startDate: string | null; // YYYY-MM-DD
  currentWeekHolder: 'me' | 'other';
  partnerMode: 'existing' | 'invite' | 'virtual' | 'solo';
  virtualPartnerName: string;
  inviteEmail: string;
}

export const DEFAULT_CUSTODY_STATE: CustodyStepState = {
  preset: null,
  customWeek: ['me', 'me', 'me', 'other', 'other', 'alt', 'alt'],
  handoffTime: '18:00',
  startDate: null,
  currentWeekHolder: 'me',
  partnerMode: 'virtual',
  virtualPartnerName: '',
  inviteEmail: '',
};

export interface SubStepProps {
  state: CustodyStepState;
  setState: (updater: (prev: CustodyStepState) => CustodyStepState) => void;
  onNext: () => void;
  onBack: () => void;
  onSkipAll?: () => void;
  hasExistingPartner?: boolean;
  existingPartnerLabel?: string;
}

/**
 * Presets that rotate bi-weekly. For these, the A4 screen is shown so the user
 * can pick which parent holds the current week. Other presets skip A4.
 */
export const BI_WEEKLY_PRESETS = new Set<CustodyPresetKey>([
  'week_on_week',
  'two_two_three',
  'sun_tue_alt_weekend',
  'mon_wed_alt_weekend',
  'alt_weekends_only',
  'three_four_four_three',
]);

export function presetNeedsStartDate(preset: CustodyPresetKey | null): boolean {
  if (!preset) return false;
  return BI_WEEKLY_PRESETS.has(preset);
}

/** True when the custom week has any "alternating" day — requires bi-weekly rotation. */
export function customWeekHasAlternating(days: DaySlotState[]): boolean {
  return days.some((d) => d === 'alt');
}

/**
 * Convert `customWeek: DaySlotState[]` into a pair of weekday bitmasks —
 * one for each of the 2-week rotation positions.
 *   - `'me'`           day is mine in BOTH weeks.
 *   - `'other'`        day is the other parent's in BOTH weeks.
 *   - `'alt'`          day is mine in week 1 and the other parent's in week 2.
 *
 * When no day is `'alt'`, mask2 equals mask1 and the caller can treat the
 * pattern as a simple 1-week cycle (by passing `mask2 = null`).
 */
export function customWeekToMasks(days: DaySlotState[]): {
  mask1: number;
  mask2: number;
  hasAlt: boolean;
} {
  let mask1 = 0;
  let mask2 = 0;
  let hasAlt = false;
  for (let i = 0; i < 7; i++) {
    const state = days[i];
    const bit = 1 << i;
    if (state === 'me') {
      mask1 |= bit;
      mask2 |= bit;
    } else if (state === 'alt') {
      // Week 1 = mine, Week 2 = other's. If the user flips "current week holder"
      // to "other", CustodyStep swaps these masks at save time.
      mask1 |= bit;
      hasAlt = true;
    }
    // 'other' → leave both masks off.
  }
  return { mask1, mask2, hasAlt };
}
