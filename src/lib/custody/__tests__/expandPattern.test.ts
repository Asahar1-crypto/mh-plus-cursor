import { describe, it, expect } from 'vitest';
import { expandPattern, ownerDatesSet } from '../expandPattern';
import { PRESET_CATALOG } from '../presets';
import type { CustodyPatternRow, CustodyPresetKey } from '@/integrations/supabase/custodyTypes';

function makePattern(overrides: Partial<CustodyPatternRow> = {}): CustodyPatternRow {
  const preset = (overrides.preset_key ?? 'week_on_week') as CustodyPresetKey;
  const def = PRESET_CATALOG[preset];
  return {
    id: 'pat-1',
    account_id: 'acc-1',
    owner_user_id: 'user-1',
    preset_key: preset,
    label: null,
    weekday_mask_week1: def.mask1,
    weekday_mask_week2: def.mask2,
    dtstart: '2026-04-19', // Sunday, aligns week 1
    until_date: null,
    handoff_time: '18:00',
    weekend_handoff_time: null,
    acts_as: null,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    ...overrides,
  };
}

describe('expandPattern', () => {
  describe('week_on_week', () => {
    it('every day in week 1 is an owner day', () => {
      const pattern = makePattern({ preset_key: 'week_on_week' });
      const days = expandPattern(pattern, '2026-04-19', '2026-04-25');
      expect(days).toHaveLength(7);
      expect(days.every((d) => d.isOwnerDay)).toBe(true);
    });
    it('every day in week 2 is NOT an owner day', () => {
      const pattern = makePattern({ preset_key: 'week_on_week' });
      const days = expandPattern(pattern, '2026-04-26', '2026-05-02');
      expect(days.every((d) => !d.isOwnerDay)).toBe(true);
    });
    it('alternates correctly across 4 weeks', () => {
      const pattern = makePattern({ preset_key: 'week_on_week' });
      const days = expandPattern(pattern, '2026-04-19', '2026-05-16');
      // 4 weeks * 7 days = 28. Half should be owner days (14).
      expect(days.filter((d) => d.isOwnerDay).length).toBe(14);
    });
  });

  describe('weekdays_weekend (single-week, no rotation)', () => {
    it('Sun-Thu owner, Fri-Sat not', () => {
      const pattern = makePattern({ preset_key: 'weekdays_weekend' });
      const days = expandPattern(pattern, '2026-04-19', '2026-04-25');
      const expected = [true, true, true, true, true, false, false];
      expect(days.map((d) => d.isOwnerDay)).toEqual(expected);
    });
    it('same result across 10 weeks (no rotation)', () => {
      const pattern = makePattern({ preset_key: 'weekdays_weekend' });
      const days = expandPattern(pattern, '2026-04-19', '2026-06-27');
      // 10 weeks: 5 owner days each = 50.
      expect(days.filter((d) => d.isOwnerDay).length).toBe(50);
    });
  });

  describe('alt_weekends_only', () => {
    it('week 1 has Fri+Sat as owner, week 2 has neither', () => {
      const pattern = makePattern({ preset_key: 'alt_weekends_only' });
      const w1 = expandPattern(pattern, '2026-04-19', '2026-04-25');
      const w2 = expandPattern(pattern, '2026-04-26', '2026-05-02');
      expect(w1.filter((d) => d.isOwnerDay).length).toBe(2);
      expect(w2.filter((d) => d.isOwnerDay).length).toBe(0);
    });
  });

  describe('bounds', () => {
    it('dates before dtstart are not owner days', () => {
      const pattern = makePattern({
        preset_key: 'week_on_week',
        dtstart: '2026-05-01',
      });
      const days = expandPattern(pattern, '2026-04-19', '2026-04-30');
      expect(days.every((d) => !d.isOwnerDay)).toBe(true);
    });

    it('dates after until_date are not owner days', () => {
      const pattern = makePattern({
        preset_key: 'week_on_week',
        until_date: '2026-04-25',
      });
      const days = expandPattern(pattern, '2026-04-19', '2026-05-02');
      // First 7 days owner, next 7 not.
      expect(days.slice(0, 7).every((d) => d.isOwnerDay)).toBe(true);
      expect(days.slice(7).every((d) => !d.isOwnerDay)).toBe(true);
    });
  });

  describe('two_two_three', () => {
    it('week 1: Sun,Mon,Fri,Sat are owner days (4); Tue-Thu not (3)', () => {
      const pattern = makePattern({ preset_key: 'two_two_three' });
      const days = expandPattern(pattern, '2026-04-19', '2026-04-25');
      const expected = [true, true, false, false, false, true, true];
      expect(days.map((d) => d.isOwnerDay)).toEqual(expected);
    });
    it('week 2: Tue-Thu are owner days (3); rest not', () => {
      const pattern = makePattern({ preset_key: 'two_two_three' });
      const days = expandPattern(pattern, '2026-04-26', '2026-05-02');
      const expected = [false, false, true, true, true, false, false];
      expect(days.map((d) => d.isOwnerDay)).toEqual(expected);
    });
  });

  describe('ownerDatesSet', () => {
    it('returns a Set of only owner dates', () => {
      const pattern = makePattern({ preset_key: 'weekdays_weekend' });
      const days = expandPattern(pattern, '2026-04-19', '2026-04-25');
      const set = ownerDatesSet(days);
      expect(set.size).toBe(5);
      expect(set.has('2026-04-19')).toBe(true); // Sun
      expect(set.has('2026-04-24')).toBe(false); // Fri
    });
  });
});
