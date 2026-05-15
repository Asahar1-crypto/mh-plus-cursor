import { describe, it, expect } from 'vitest';
import {
  PRESET_CATALOG,
  PRESET_ORDER,
  maskCount,
  maskHasDay,
  maskSetDay,
  maskToDayIndices,
} from '../presets';
import { WEEKDAY_BITS } from '@/integrations/supabase/custodyTypes';

describe('preset catalog', () => {
  it('exports all 8 presets in the expected order', () => {
    expect(PRESET_ORDER).toHaveLength(8);
    for (const key of PRESET_ORDER) {
      expect(PRESET_CATALOG[key]).toBeDefined();
      expect(PRESET_CATALOG[key].labelHe.length).toBeGreaterThan(0);
    }
  });

  it('all non-custom presets have a mask1 in [0..127]', () => {
    for (const key of PRESET_ORDER) {
      const p = PRESET_CATALOG[key];
      expect(p.mask1).toBeGreaterThanOrEqual(0);
      expect(p.mask1).toBeLessThanOrEqual(127);
    }
  });

  it('week_on_week has all days in week 1, none in week 2', () => {
    const p = PRESET_CATALOG.week_on_week;
    expect(maskCount(p.mask1)).toBe(7);
    expect(p.mask2).toBe(0);
  });

  it('weekdays_weekend covers Sun-Thu in a single-week pattern', () => {
    const p = PRESET_CATALOG.weekdays_weekend;
    expect(p.mask2).toBeNull();
    expect(maskCount(p.mask1)).toBe(5);
    const { SUN, MON, TUE, WED, THU } = WEEKDAY_BITS;
    expect(p.mask1).toBe(SUN | MON | TUE | WED | THU);
  });

  it('alt_weekends_only only holds Fri+Sat in week 1', () => {
    const p = PRESET_CATALOG.alt_weekends_only;
    expect(p.mask1).toBe(WEEKDAY_BITS.FRI | WEEKDAY_BITS.SAT);
    expect(p.mask2).toBe(0);
  });

  it('custom preset has empty masks and isCustom flag', () => {
    const p = PRESET_CATALOG.custom;
    expect(p.isCustom).toBe(true);
    expect(p.mask1).toBe(0);
  });
});

describe('bitmask helpers', () => {
  describe('maskHasDay', () => {
    it('true for set bits', () => {
      const mask = WEEKDAY_BITS.SUN | WEEKDAY_BITS.WED;
      expect(maskHasDay(mask, 0)).toBe(true); // Sun
      expect(maskHasDay(mask, 3)).toBe(true); // Wed
    });
    it('false for unset bits', () => {
      const mask = WEEKDAY_BITS.SUN;
      expect(maskHasDay(mask, 1)).toBe(false);
      expect(maskHasDay(mask, 6)).toBe(false);
    });
  });

  describe('maskSetDay', () => {
    it('turns bits on', () => {
      const result = maskSetDay(0, 3, true);
      expect(maskHasDay(result, 3)).toBe(true);
    });
    it('turns bits off', () => {
      const result = maskSetDay(127, 3, false);
      expect(maskHasDay(result, 3)).toBe(false);
      expect(maskCount(result)).toBe(6);
    });
    it('is idempotent', () => {
      const m1 = maskSetDay(0, 3, true);
      const m2 = maskSetDay(m1, 3, true);
      expect(m1).toBe(m2);
    });
  });

  describe('maskToDayIndices', () => {
    it('returns indices in ascending order', () => {
      const mask = WEEKDAY_BITS.SAT | WEEKDAY_BITS.SUN | WEEKDAY_BITS.WED;
      expect(maskToDayIndices(mask)).toEqual([0, 3, 6]);
    });
    it('empty for 0', () => {
      expect(maskToDayIndices(0)).toEqual([]);
    });
  });

  describe('maskCount', () => {
    it('counts set bits', () => {
      expect(maskCount(0)).toBe(0);
      expect(maskCount(1)).toBe(1);
      expect(maskCount(127)).toBe(7);
      expect(maskCount(WEEKDAY_BITS.FRI | WEEKDAY_BITS.SAT)).toBe(2);
    });
  });
});
