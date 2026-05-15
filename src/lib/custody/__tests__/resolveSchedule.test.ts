import { describe, it, expect } from 'vitest';
import {
  conflictDates,
  countDays,
  hasConflicts,
  resolveSchedule,
} from '../resolveSchedule';
import { PRESET_CATALOG } from '../presets';
import type {
  CustodyExceptionRow,
  CustodyPatternRow,
  CustodyPresetKey,
} from '@/integrations/supabase/custodyTypes';

const USER_A = 'user-a';
const USER_B = 'user-b';

function pattern(
  ownerUserId: string,
  preset: CustodyPresetKey,
  overrides: Partial<CustodyPatternRow> = {},
): CustodyPatternRow {
  const def = PRESET_CATALOG[preset];
  return {
    id: `pat-${ownerUserId}`,
    account_id: 'acc-1',
    owner_user_id: ownerUserId,
    preset_key: preset,
    label: null,
    weekday_mask_week1: def.mask1,
    weekday_mask_week2: def.mask2,
    dtstart: '2026-04-19', // Sunday
    until_date: null,
    handoff_time: '18:00',
    weekend_handoff_time: null,
    acts_as: null,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    ...overrides,
  };
}

function exc(overrides: Partial<CustodyExceptionRow> = {}): CustodyExceptionRow {
  return {
    id: 'exc-1',
    account_id: 'acc-1',
    kind: 'one_off',
    event_name: null,
    parent_event: null,
    source_event_id: null,
    education_level: null,
    claimed_by: null,
    start_date: '2026-04-21',
    end_date: '2026-04-21',
    start_time: null,
    end_time: null,
    notes: null,
    created_by: USER_A,
    created_at: '2026-04-20T10:00:00Z',
    updated_at: '2026-04-20T10:00:00Z',
    ...overrides,
  };
}

describe('resolveSchedule', () => {
  describe('both-missing (no patterns, no exceptions)', () => {
    it('every day is neither', () => {
      const result = resolveSchedule({
        rangeFromIso: '2026-04-19',
        rangeToIso: '2026-04-25',
        parentA: null,
        parentB: null,
        parentAUserId: USER_A,
        parentBUserId: USER_B,
        exceptions: [],
      });
      expect(result.every((d) => d.owner === 'neither')).toBe(true);
    });
  });

  describe('single-parent inference (only A entered)', () => {
    it('B gets the complement when A entered weekdays_weekend', () => {
      const result = resolveSchedule({
        rangeFromIso: '2026-04-19',
        rangeToIso: '2026-04-25',
        parentA: pattern(USER_A, 'weekdays_weekend'),
        parentB: null,
        parentAUserId: USER_A,
        parentBUserId: USER_B,
        exceptions: [],
      });
      const counts = countDays(result);
      expect(counts.parentA).toBe(5);
      expect(counts.parentB).toBe(2);
      expect(counts.neither).toBe(0);
      expect(hasConflicts(result)).toBe(false);
    });
    it('B gets the complement when A entered week_on_week (first week)', () => {
      const result = resolveSchedule({
        rangeFromIso: '2026-04-19',
        rangeToIso: '2026-04-25',
        parentA: pattern(USER_A, 'week_on_week'),
        parentB: null,
        parentAUserId: USER_A,
        parentBUserId: USER_B,
        exceptions: [],
      });
      const counts = countDays(result);
      expect(counts.parentA).toBe(7);
      expect(counts.parentB).toBe(0);
    });
  });

  describe('single-parent inference (only B entered)', () => {
    it('A gets the complement', () => {
      const result = resolveSchedule({
        rangeFromIso: '2026-04-19',
        rangeToIso: '2026-04-25',
        parentA: null,
        parentB: pattern(USER_B, 'weekdays_weekend'),
        parentAUserId: USER_A,
        parentBUserId: USER_B,
        exceptions: [],
      });
      const counts = countDays(result);
      expect(counts.parentB).toBe(5);
      expect(counts.parentA).toBe(2);
    });
  });

  describe('both-present, complementary patterns (no overlap)', () => {
    it('A = weekdays, B = weekends -> no conflicts, no gaps', () => {
      const weekendsOnlyForB = pattern(USER_B, 'weekdays_weekend', {
        // flip the mask so B has weekends
        weekday_mask_week1: 0b1100000, // Fri (32) + Sat (64) = 96
      });
      const result = resolveSchedule({
        rangeFromIso: '2026-04-19',
        rangeToIso: '2026-04-25',
        parentA: pattern(USER_A, 'weekdays_weekend'),
        parentB: weekendsOnlyForB,
        parentAUserId: USER_A,
        parentBUserId: USER_B,
        exceptions: [],
      });
      const counts = countDays(result);
      expect(counts.parentA).toBe(5);
      expect(counts.parentB).toBe(2);
      expect(counts.both).toBe(0);
      expect(counts.neither).toBe(0);
    });
  });

  describe('both-present with overlapping claim (conflict)', () => {
    it('overlapping days marked owner=both, conflict=true', () => {
      const result = resolveSchedule({
        rangeFromIso: '2026-04-19',
        rangeToIso: '2026-04-25',
        parentA: pattern(USER_A, 'week_on_week'), // all 7 days
        parentB: pattern(USER_B, 'week_on_week'), // all 7 days too
        parentAUserId: USER_A,
        parentBUserId: USER_B,
        exceptions: [],
      });
      expect(hasConflicts(result)).toBe(true);
      expect(conflictDates(result)).toHaveLength(7);
      expect(result.every((d) => d.owner === 'both')).toBe(true);
    });
  });

  describe('both-present with gaps (neither)', () => {
    it('days no one claimed become neither', () => {
      // A has only Sun, B has only Mon -> Tue-Sat is neither
      const aSunday = pattern(USER_A, 'weekdays_weekend', { weekday_mask_week1: 0b0000001 });
      const bMonday = pattern(USER_B, 'weekdays_weekend', { weekday_mask_week1: 0b0000010 });
      const result = resolveSchedule({
        rangeFromIso: '2026-04-19',
        rangeToIso: '2026-04-25',
        parentA: aSunday,
        parentB: bMonday,
        parentAUserId: USER_A,
        parentBUserId: USER_B,
        exceptions: [],
      });
      const counts = countDays(result);
      expect(counts.parentA).toBe(1);
      expect(counts.parentB).toBe(1);
      expect(counts.neither).toBe(5);
      expect(counts.both).toBe(0);
    });
  });

  describe('exceptions override patterns', () => {
    it('A-claimed holiday on a B-pattern day flips to A', () => {
      const bEveryDay = pattern(USER_B, 'week_on_week'); // B owns all 7 days
      const result = resolveSchedule({
        rangeFromIso: '2026-04-19',
        rangeToIso: '2026-04-25',
        parentA: pattern(USER_A, 'custom', { weekday_mask_week1: 0 }), // A owns none
        parentB: bEveryDay,
        parentAUserId: USER_A,
        parentBUserId: USER_B,
        exceptions: [
          exc({
            id: 'exc-holiday',
            kind: 'holiday',
            event_name: 'סוכות',
            start_date: '2026-04-21',
            end_date: '2026-04-21',
            claimed_by: USER_A,
          }),
        ],
      });
      const day21 = result.find((d) => d.date === '2026-04-21')!;
      expect(day21.owner).toBe('A');
      expect(day21.conflict).toBe(false);
      expect(day21.eventName).toBe('סוכות');
      expect(day21.exceptionKind).toBe('holiday');
    });

    it('unassigned (claimed_by=null) holiday shows as neither with event name', () => {
      const result = resolveSchedule({
        rangeFromIso: '2026-04-21',
        rangeToIso: '2026-04-21',
        parentA: pattern(USER_A, 'week_on_week'),
        parentB: null,
        parentAUserId: USER_A,
        parentBUserId: USER_B,
        exceptions: [
          exc({
            id: 'exc-unassigned',
            kind: 'holiday',
            event_name: 'פסח',
            claimed_by: null,
          }),
        ],
      });
      expect(result[0].owner).toBe('neither');
      expect(result[0].eventName).toBe('פסח');
    });

    it('two exceptions claiming different parents same day -> conflict', () => {
      const result = resolveSchedule({
        rangeFromIso: '2026-04-21',
        rangeToIso: '2026-04-21',
        parentA: null,
        parentB: null,
        parentAUserId: USER_A,
        parentBUserId: USER_B,
        exceptions: [
          exc({ id: 'exc-1', claimed_by: USER_A }),
          exc({ id: 'exc-2', claimed_by: USER_B, created_at: '2026-04-20T11:00:00Z' }),
        ],
      });
      expect(result[0].owner).toBe('both');
      expect(result[0].conflict).toBe(true);
    });
  });

  describe('audit badge', () => {
    it('marks dates in recentlyEditedDates with auditBadge=true', () => {
      const result = resolveSchedule({
        rangeFromIso: '2026-04-19',
        rangeToIso: '2026-04-21',
        parentA: null,
        parentB: null,
        parentAUserId: USER_A,
        parentBUserId: USER_B,
        exceptions: [],
        recentlyEditedDates: new Set(['2026-04-20']),
      });
      expect(result.find((d) => d.date === '2026-04-19')!.auditBadge).toBe(false);
      expect(result.find((d) => d.date === '2026-04-20')!.auditBadge).toBe(true);
      expect(result.find((d) => d.date === '2026-04-21')!.auditBadge).toBe(false);
    });
  });

  describe('countDays', () => {
    it('buckets all 4 categories', () => {
      const counts = countDays([
        { date: '2026-04-19', owner: 'A', ownerUserId: USER_A, conflict: false, exceptionId: null, exceptionKind: null, eventName: null, auditBadge: false },
        { date: '2026-04-20', owner: 'B', ownerUserId: USER_B, conflict: false, exceptionId: null, exceptionKind: null, eventName: null, auditBadge: false },
        { date: '2026-04-21', owner: 'both', ownerUserId: null, conflict: true, exceptionId: null, exceptionKind: null, eventName: null, auditBadge: false },
        { date: '2026-04-22', owner: 'neither', ownerUserId: null, conflict: false, exceptionId: null, exceptionKind: null, eventName: null, auditBadge: false },
      ]);
      expect(counts).toEqual({ parentA: 1, parentB: 1, both: 1, neither: 1 });
    });
  });
});
