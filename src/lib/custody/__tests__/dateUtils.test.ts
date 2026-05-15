import { describe, it, expect } from 'vitest';
import {
  addDays,
  addIsoDays,
  biWeeklyPhase,
  daysBetween,
  enumerateDates,
  fromIsoDate,
  inclusiveDayCount,
  toIsoDate,
  weekdayIndex,
} from '../dateUtils';

describe('dateUtils', () => {
  describe('toIsoDate / fromIsoDate', () => {
    it('roundtrips a regular date', () => {
      const d = new Date(2026, 3, 21, 0, 0, 0); // Apr 21 2026 local
      expect(toIsoDate(d)).toBe('2026-04-21');
      expect(toIsoDate(fromIsoDate('2026-04-21'))).toBe('2026-04-21');
    });

    it('pads month and day to 2 digits', () => {
      const d = new Date(2026, 0, 5);
      expect(toIsoDate(d)).toBe('2026-01-05');
    });

    it('does not shift the date around DST (Israel transitions are in Mar/Oct)', () => {
      // Israeli DST start 2026: March 27, 2026 (clock jumps 02:00 -> 03:00)
      // Israeli DST end   2026: October 25, 2026
      expect(toIsoDate(fromIsoDate('2026-03-27'))).toBe('2026-03-27');
      expect(toIsoDate(fromIsoDate('2026-03-28'))).toBe('2026-03-28');
      expect(toIsoDate(fromIsoDate('2026-10-25'))).toBe('2026-10-25');
    });
  });

  describe('addDays / addIsoDays', () => {
    it('adds positive days', () => {
      expect(addIsoDays('2026-04-21', 10)).toBe('2026-05-01');
    });
    it('subtracts negative days', () => {
      expect(addIsoDays('2026-04-21', -21)).toBe('2026-03-31');
    });
    it('handles month boundary', () => {
      expect(addIsoDays('2026-01-31', 1)).toBe('2026-02-01');
    });
    it('handles year boundary', () => {
      expect(addIsoDays('2026-12-31', 1)).toBe('2027-01-01');
    });
    it('is DST-safe across March transition', () => {
      expect(addIsoDays('2026-03-26', 1)).toBe('2026-03-27');
      expect(addIsoDays('2026-03-27', 1)).toBe('2026-03-28');
    });
  });

  describe('daysBetween', () => {
    it('counts exclusive-end whole days', () => {
      expect(daysBetween(fromIsoDate('2026-04-21'), fromIsoDate('2026-04-24'))).toBe(3);
    });
    it('returns 0 for same day', () => {
      expect(daysBetween(fromIsoDate('2026-04-21'), fromIsoDate('2026-04-21'))).toBe(0);
    });
    it('returns negative when reversed', () => {
      expect(daysBetween(fromIsoDate('2026-04-24'), fromIsoDate('2026-04-21'))).toBe(-3);
    });
    it('survives DST', () => {
      // March 26 -> March 28 should be exactly 2 days even with DST in between.
      expect(daysBetween(fromIsoDate('2026-03-26'), fromIsoDate('2026-03-28'))).toBe(2);
    });
  });

  describe('inclusiveDayCount', () => {
    it('includes both endpoints', () => {
      expect(inclusiveDayCount('2026-04-21', '2026-04-21')).toBe(1);
      expect(inclusiveDayCount('2026-04-21', '2026-04-27')).toBe(7);
    });
  });

  describe('enumerateDates', () => {
    it('returns each date in order', () => {
      expect(enumerateDates('2026-04-21', '2026-04-24')).toEqual([
        '2026-04-21',
        '2026-04-22',
        '2026-04-23',
        '2026-04-24',
      ]);
    });
    it('returns single element when endpoints equal', () => {
      expect(enumerateDates('2026-04-21', '2026-04-21')).toEqual(['2026-04-21']);
    });
    it('returns empty when reversed', () => {
      expect(enumerateDates('2026-04-24', '2026-04-21')).toEqual([]);
    });
  });

  describe('weekdayIndex', () => {
    it('Sunday = 0', () => {
      // 2026-04-19 is a Sunday
      expect(weekdayIndex('2026-04-19')).toBe(0);
    });
    it('Saturday = 6', () => {
      // 2026-04-25 is a Saturday
      expect(weekdayIndex('2026-04-25')).toBe(6);
    });
  });

  describe('biWeeklyPhase', () => {
    it('phase 0 on the dtstart week', () => {
      // dtstart is Sunday 2026-04-19 — same week as 2026-04-21
      expect(biWeeklyPhase('2026-04-21', '2026-04-19')).toBe(0);
    });
    it('phase 1 on the week after', () => {
      expect(biWeeklyPhase('2026-04-28', '2026-04-19')).toBe(1);
    });
    it('phase 0 two weeks out', () => {
      expect(biWeeklyPhase('2026-05-03', '2026-04-19')).toBe(0);
    });
    it('handles cross-year anchor', () => {
      // dtstart 2026-12-27 (Sun). Two weeks later: 2027-01-10.
      expect(biWeeklyPhase('2027-01-10', '2026-12-27')).toBe(0);
      expect(biWeeklyPhase('2027-01-03', '2026-12-27')).toBe(1);
    });
  });

  describe('addDays', () => {
    it('does not mutate input', () => {
      const a = new Date(2026, 3, 21);
      const b = addDays(a, 5);
      expect(toIsoDate(a)).toBe('2026-04-21');
      expect(toIsoDate(b)).toBe('2026-04-26');
    });
  });
});
