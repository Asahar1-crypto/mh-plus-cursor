import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getEffectiveBillingDay,
  getCycleRange,
  isDateInCycle,
  getCycleRangeISO,
  getCycleLabelHebrew,
  getCurrentCycle,
  getCycleDayInfo,
} from '../billingCycleUtils';

describe('billingCycleUtils', () => {
  describe('getEffectiveBillingDay', () => {
    it('returns the billing day when it fits in the month', () => {
      expect(getEffectiveBillingDay(15, 3, 2026)).toBe(15);
      expect(getEffectiveBillingDay(1, 1, 2026)).toBe(1);
      expect(getEffectiveBillingDay(28, 2, 2026)).toBe(28);
    });

    it('clamps day 31 to last day of February (non-leap)', () => {
      expect(getEffectiveBillingDay(31, 2, 2026)).toBe(28);
    });

    it('clamps day 31 to last day of February (leap year)', () => {
      expect(getEffectiveBillingDay(31, 2, 2028)).toBe(29);
    });

    it('clamps day 31 to 30 for April', () => {
      expect(getEffectiveBillingDay(31, 4, 2026)).toBe(30);
    });

    it('returns 31 for months with 31 days', () => {
      expect(getEffectiveBillingDay(31, 1, 2026)).toBe(31);
      expect(getEffectiveBillingDay(31, 3, 2026)).toBe(31);
      expect(getEffectiveBillingDay(31, 7, 2026)).toBe(31);
    });
  });

  describe('getCycleRange', () => {
    it('billingDay=1 returns exact calendar month (identity)', () => {
      const { start, end } = getCycleRange(1, 3, 2026);
      expect(start).toEqual(new Date(2026, 2, 1)); // March 1
      expect(end.getFullYear()).toBe(2026);
      expect(end.getMonth()).toBe(2); // March
      expect(end.getDate()).toBe(31);
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
      expect(end.getMilliseconds()).toBe(999);
    });

    it('billingDay=1 for February returns Feb 1-28 (non-leap)', () => {
      const { start, end } = getCycleRange(1, 2, 2026);
      expect(start).toEqual(new Date(2026, 1, 1));
      expect(end.getDate()).toBe(28);
      expect(end.getMonth()).toBe(1);
    });

    it('billingDay=15 returns March 15 - April 14', () => {
      const { start, end } = getCycleRange(15, 3, 2026);
      expect(start).toEqual(new Date(2026, 2, 15));
      expect(end.getFullYear()).toBe(2026);
      expect(end.getMonth()).toBe(3); // April
      expect(end.getDate()).toBe(14);
      expect(end.getHours()).toBe(23);
    });

    it('handles year boundary: billingDay=15, December 2026', () => {
      const { start, end } = getCycleRange(15, 12, 2026);
      expect(start).toEqual(new Date(2026, 11, 15)); // Dec 15, 2026
      expect(end.getFullYear()).toBe(2027);
      expect(end.getMonth()).toBe(0); // January
      expect(end.getDate()).toBe(14);
    });

    it('handles billingDay=31 clamping across months', () => {
      // January cycle with billingDay=31: Jan 31 - Feb 27 (since Feb has 28 days, effective=28, end=27)
      const { start, end } = getCycleRange(31, 1, 2026);
      expect(start).toEqual(new Date(2026, 0, 31)); // Jan 31
      expect(end.getMonth()).toBe(1); // February
      expect(end.getDate()).toBe(27); // Feb 28 - 1 = 27
    });

    it('billingDay=10 for June returns June 10 - July 9', () => {
      const { start, end } = getCycleRange(10, 6, 2026);
      expect(start).toEqual(new Date(2026, 5, 10));
      expect(end.getMonth()).toBe(6); // July
      expect(end.getDate()).toBe(9);
    });
  });

  describe('isDateInCycle', () => {
    it('returns true for date at cycle start', () => {
      expect(isDateInCycle(new Date(2026, 2, 15), 15, 3, 2026)).toBe(true);
    });

    it('returns true for date at cycle end', () => {
      expect(isDateInCycle(new Date(2026, 3, 14, 12, 0), 15, 3, 2026)).toBe(true);
    });

    it('returns true for date in middle of cycle', () => {
      expect(isDateInCycle(new Date(2026, 2, 25), 15, 3, 2026)).toBe(true);
    });

    it('returns false for date before cycle start', () => {
      expect(isDateInCycle(new Date(2026, 2, 14), 15, 3, 2026)).toBe(false);
    });

    it('returns false for date after cycle end', () => {
      expect(isDateInCycle(new Date(2026, 3, 15), 15, 3, 2026)).toBe(false);
    });

    it('works with billingDay=1 (calendar month)', () => {
      expect(isDateInCycle(new Date(2026, 2, 1), 1, 3, 2026)).toBe(true);
      expect(isDateInCycle(new Date(2026, 2, 31), 1, 3, 2026)).toBe(true);
      expect(isDateInCycle(new Date(2026, 1, 28), 1, 3, 2026)).toBe(false);
      expect(isDateInCycle(new Date(2026, 3, 1), 1, 3, 2026)).toBe(false);
    });

    it('accepts string dates', () => {
      expect(isDateInCycle('2026-03-20', 15, 3, 2026)).toBe(true);
      expect(isDateInCycle('2026-03-14', 15, 3, 2026)).toBe(false);
    });
  });

  describe('getCycleRangeISO', () => {
    it('returns YYYY-MM-DD strings for billingDay=1', () => {
      const { startISO, endISO } = getCycleRangeISO(1, 3, 2026);
      expect(startISO).toBe('2026-03-01');
      expect(endISO).toBe('2026-03-31');
    });

    it('returns YYYY-MM-DD strings for billingDay=15', () => {
      const { startISO, endISO } = getCycleRangeISO(15, 3, 2026);
      expect(startISO).toBe('2026-03-15');
      expect(endISO).toBe('2026-04-14');
    });

    it('handles year boundary', () => {
      const { startISO, endISO } = getCycleRangeISO(15, 12, 2026);
      expect(startISO).toBe('2026-12-15');
      expect(endISO).toBe('2027-01-14');
    });

    it('pads single-digit months and days', () => {
      const { startISO, endISO } = getCycleRangeISO(5, 1, 2026);
      expect(startISO).toBe('2026-01-05');
      expect(endISO).toBe('2026-02-04');
    });
  });

  describe('getCycleLabelHebrew', () => {
    it('billingDay=1 returns month name + year', () => {
      expect(getCycleLabelHebrew(1, 3, 2026)).toBe('מרץ 2026');
    });

    it('billingDay=1 for January returns correct Hebrew name', () => {
      expect(getCycleLabelHebrew(1, 1, 2026)).toBe('ינואר 2026');
    });

    it('billingDay=1 for December returns correct Hebrew name', () => {
      expect(getCycleLabelHebrew(1, 12, 2026)).toBe('דצמבר 2026');
    });

    it('billingDay=15 returns month name with day range', () => {
      expect(getCycleLabelHebrew(15, 3, 2026)).toBe('מרץ (15-14)');
    });

    it('billingDay=10 returns month name with day range', () => {
      expect(getCycleLabelHebrew(10, 6, 2026)).toBe('יוני (10-9)');
    });

    it('billingDay=31 with clamping shows effective days', () => {
      // February 2026: effective start=28, next month March effective=31, end=30
      const label = getCycleLabelHebrew(31, 2, 2026);
      expect(label).toBe('פברואר (28-30)');
    });
  });

  describe('getCurrentCycle', () => {
    let dateSpy: ReturnType<typeof vi.spyOn>;

    afterEach(() => {
      dateSpy?.mockRestore();
    });

    it('billingDay=1 returns current calendar month', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 2, 15)); // March 15
      expect(getCurrentCycle(1)).toEqual({ month: 3, year: 2026 });
      vi.useRealTimers();
    });

    it('billingDay=15 returns current month when today >= 15', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 2, 20)); // March 20
      expect(getCurrentCycle(15)).toEqual({ month: 3, year: 2026 });
      vi.useRealTimers();
    });

    it('billingDay=15 returns previous month when today < 15', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 2, 10)); // March 10
      expect(getCurrentCycle(15)).toEqual({ month: 2, year: 2026 });
      vi.useRealTimers();
    });

    it('billingDay=15 wraps year when in January before billing day', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 0, 5)); // January 5
      expect(getCurrentCycle(15)).toEqual({ month: 12, year: 2025 });
      vi.useRealTimers();
    });

    it('billingDay=15 on exactly day 15 returns current month', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 5, 15)); // June 15
      expect(getCurrentCycle(15)).toEqual({ month: 6, year: 2026 });
      vi.useRealTimers();
    });
  });

  describe('getCycleDayInfo', () => {
    it('returns correct totalDays for billingDay=1 in March', () => {
      const { totalDays } = getCycleDayInfo(1, 3, 2026);
      expect(totalDays).toBe(31);
    });

    it('returns correct totalDays for billingDay=1 in February (non-leap)', () => {
      const { totalDays } = getCycleDayInfo(1, 2, 2026);
      expect(totalDays).toBe(28);
    });

    it('returns correct totalDays for billingDay=15 in March', () => {
      // March 15 - April 14 = 31 days
      const { totalDays } = getCycleDayInfo(15, 3, 2026);
      expect(totalDays).toBe(31);
    });

    it('daysPassed is clamped between 0 and totalDays', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 2, 20)); // March 20

      const info = getCycleDayInfo(1, 3, 2026);
      expect(info.daysPassed).toBe(20); // March 1-20 = 20 days
      expect(info.daysPassed).toBeLessThanOrEqual(info.totalDays);
      expect(info.daysPassed).toBeGreaterThanOrEqual(0);

      vi.useRealTimers();
    });

    it('daysPassed is 0 when today is before cycle start', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 1, 10)); // Feb 10

      const info = getCycleDayInfo(1, 3, 2026);
      expect(info.daysPassed).toBe(0);

      vi.useRealTimers();
    });

    it('daysPassed equals totalDays when today is past cycle end', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 4, 1)); // May 1

      const info = getCycleDayInfo(1, 3, 2026);
      expect(info.daysPassed).toBe(info.totalDays);

      vi.useRealTimers();
    });
  });
});
