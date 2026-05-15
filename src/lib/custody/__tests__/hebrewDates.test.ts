import { describe, it, expect } from 'vitest';
import {
  formatDateRange,
  formatDateWithYear,
  formatDayLong,
  formatDayShort,
  formatWeekday,
  schoolYearFor,
  schoolYearLabelHebrew,
} from '@/lib/hebrewDates';

describe('hebrewDates', () => {
  describe('formatDayShort', () => {
    it('weekday prefix + day.month', () => {
      // 2026-04-21 is Tuesday
      expect(formatDayShort('2026-04-21')).toBe('ג׳ 21.4');
    });
  });

  describe('formatDateWithYear', () => {
    it('always includes year', () => {
      expect(formatDateWithYear('2026-04-21')).toBe('21.4.2026');
      expect(formatDateWithYear('2027-01-05')).toBe('5.1.2027');
    });
  });

  describe('formatDateRange', () => {
    it('same day -> single date with year', () => {
      expect(formatDateRange('2026-04-21', '2026-04-21')).toBe('21.4.2026');
    });
    it('same year -> d.m – d.m', () => {
      expect(formatDateRange('2026-04-21', '2026-04-28')).toBe('21.4 – 28.4');
    });
    it('different year -> includes end year', () => {
      expect(formatDateRange('2026-12-27', '2027-01-03')).toBe('27.12 – 3.1.2027');
    });
  });

  describe('formatDayLong', () => {
    it('Hebrew weekday + day + month + year', () => {
      const out = formatDayLong('2026-04-21');
      expect(out).toMatch(/21/);
      expect(out).toMatch(/אפריל/);
      expect(out).toMatch(/2026/);
    });
  });

  describe('formatWeekday', () => {
    it('short form returns one letter/apostrophe', () => {
      expect(formatWeekday('2026-04-21', { short: true })).toBe('ג׳');
    });
  });

  describe('schoolYearFor', () => {
    it('dates in Sep-Dec map to the current year as start', () => {
      expect(schoolYearFor('2026-09-01')).toBe('2026-2027');
      expect(schoolYearFor('2026-12-31')).toBe('2026-2027');
    });
    it('dates in Jan-Aug map to the previous year as start', () => {
      expect(schoolYearFor('2027-01-15')).toBe('2026-2027');
      expect(schoolYearFor('2027-08-31')).toBe('2026-2027');
    });
    it('Sep 1 is the pivot', () => {
      expect(schoolYearFor('2026-08-31')).toBe('2025-2026');
      expect(schoolYearFor('2026-09-01')).toBe('2026-2027');
    });
  });

  describe('schoolYearLabelHebrew', () => {
    it('known years return Hebrew label', () => {
      expect(schoolYearLabelHebrew('2026-2027')).toBe('תשפ"ז');
      expect(schoolYearLabelHebrew('2027-2028')).toBe('תשפ"ח');
    });
    it('unknown years fall back to Gregorian', () => {
      expect(schoolYearLabelHebrew('2099-2100')).toBe('2099-2100');
    });
  });
});
