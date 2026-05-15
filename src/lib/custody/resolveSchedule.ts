/**
 * Resolve final day-by-day ownership from patterns + exceptions.
 *
 * Input: two parents' patterns (either may be null / "absent") and a flat
 *        list of exceptions (holidays, vacations, swaps, one-offs).
 * Output: for each date in the range, a resolved owner + conflict flag +
 *         exception metadata for UI rendering.
 *
 * Rules (see CUSTODY_WIREFRAME_SPEC.md and design decisions):
 *
 *  1. If parent A has no pattern AND no exceptions, treat the account as
 *     single-parent: every day goes to whoever has ANY pattern. If both
 *     parents have no pattern, every day is 'neither'.
 *  2. If only ONE parent has entered a pattern: the other parent's schedule
 *     is inferred as the complement — any date not owned by the entered
 *     parent is attributed to the absent parent. No conflict is possible.
 *  3. If BOTH parents have patterns: merge day-by-day.
 *      - Both claim the day  -> owner='both',   conflict=true
 *      - Only A claims        -> owner='A',      conflict=false
 *      - Only B claims        -> owner='B',      conflict=false
 *      - Neither claims       -> owner='neither',conflict=false
 *  4. Exceptions ALWAYS override the base pattern result for the dates
 *     they cover:
 *      - `claimed_by = A's user_id` -> owner='A' (regardless of pattern)
 *      - `claimed_by = B's user_id` -> owner='B'
 *      - `claimed_by = NULL`        -> owner='neither' (explicitly unassigned
 *                                      holiday awaiting a decision)
 *     When two exceptions cover the same day and claim different parents,
 *     we mark owner='both', conflict=true.
 *  5. Exception metadata (event_name, kind) is attached to every date it
 *     covers, for UI rendering — whether or not it changed ownership.
 */

import type {
  CustodyExceptionRow,
  CustodyPatternRow,
  DayOwner,
  ResolvedDay,
} from '@/integrations/supabase/custodyTypes';
import { enumerateDates, fromIsoDate } from './dateUtils';
import { expandPattern, ownerDatesSet } from './expandPattern';

export interface ResolveInput {
  rangeFromIso: string;
  rangeToIso: string;
  parentA: CustodyPatternRow | null;
  parentB: CustodyPatternRow | null;
  /** Concrete profile.id of parent A (used to match exception.claimed_by). */
  parentAUserId: string | null;
  parentBUserId: string | null;
  exceptions: CustodyExceptionRow[];
  /** Audit-bearing event dates — rendered with a "שונה" badge in UI. */
  recentlyEditedDates?: Set<string>;
}

export function resolveSchedule(input: ResolveInput): ResolvedDay[] {
  const { rangeFromIso, rangeToIso, parentA, parentB, parentAUserId, parentBUserId } = input;
  const recentlyEdited = input.recentlyEditedDates ?? new Set<string>();

  const dates = enumerateDates(rangeFromIso, rangeToIso);

  const aDays = parentA ? ownerDatesSet(expandPattern(parentA, rangeFromIso, rangeToIso)) : null;
  const bDays = parentB ? ownerDatesSet(expandPattern(parentB, rangeFromIso, rangeToIso)) : null;

  // Single-parent inference: only one side has any pattern input at all.
  const onlyAEntered = aDays !== null && bDays === null;
  const onlyBEntered = bDays !== null && aDays === null;
  const neitherEntered = aDays === null && bDays === null;

  // Group exceptions by date for O(1) lookup.
  const exceptionsByDate = new Map<string, CustodyExceptionRow[]>();
  for (const exc of input.exceptions) {
    for (const iso of enumerateDates(exc.start_date, exc.end_date)) {
      if (iso < rangeFromIso || iso > rangeToIso) continue;
      const list = exceptionsByDate.get(iso) ?? [];
      list.push(exc);
      exceptionsByDate.set(iso, list);
    }
  }

  const out: ResolvedDay[] = [];
  for (const iso of dates) {
    // Step 1: resolve base ownership from patterns.
    let owner: DayOwner;
    let ownerUserId: string | null = null;
    let conflict = false;

    if (neitherEntered) {
      owner = 'neither';
    } else if (onlyAEntered) {
      if (aDays!.has(iso)) {
        owner = 'A';
        ownerUserId = parentAUserId;
      } else {
        owner = 'B';
        ownerUserId = parentBUserId;
      }
    } else if (onlyBEntered) {
      if (bDays!.has(iso)) {
        owner = 'B';
        ownerUserId = parentBUserId;
      } else {
        owner = 'A';
        ownerUserId = parentAUserId;
      }
    } else {
      // Both sides entered patterns — merge.
      const inA = aDays!.has(iso);
      const inB = bDays!.has(iso);
      if (inA && inB) {
        owner = 'both';
        conflict = true;
      } else if (inA) {
        owner = 'A';
        ownerUserId = parentAUserId;
      } else if (inB) {
        owner = 'B';
        ownerUserId = parentBUserId;
      } else {
        owner = 'neither';
      }
    }

    // Step 2: apply exceptions (if any) on top.
    let exceptionId: string | null = null;
    let exceptionKind: ResolvedDay['exceptionKind'] = null;
    let eventName: string | null = null;

    const exc = exceptionsByDate.get(iso);
    if (exc && exc.length > 0) {
      // Use the last-created exception for display metadata (kind/event_name),
      // but compute claim-conflicts across all exceptions on this date.
      const sorted = [...exc].sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
      const primary = sorted[sorted.length - 1];
      exceptionId = primary.id;
      exceptionKind = primary.kind;
      eventName = primary.event_name;

      const claimers = new Set<string | null>();
      for (const e of sorted) claimers.add(e.claimed_by);

      if (claimers.size > 1 && claimers.has(parentAUserId) && claimers.has(parentBUserId)) {
        owner = 'both';
        ownerUserId = null;
        conflict = true;
      } else if (claimers.size === 1) {
        const [claimedBy] = Array.from(claimers);
        if (claimedBy === null) {
          owner = 'neither';
          ownerUserId = null;
        } else if (claimedBy === parentAUserId) {
          owner = 'A';
          ownerUserId = parentAUserId;
          conflict = false;
        } else if (claimedBy === parentBUserId) {
          owner = 'B';
          ownerUserId = parentBUserId;
          conflict = false;
        }
      }
    }

    out.push({
      date: iso,
      owner,
      ownerUserId,
      conflict,
      exceptionId,
      exceptionKind,
      eventName,
      auditBadge: recentlyEdited.has(iso),
    });
  }

  return out;
}

/**
 * Count days per owner. If `mode='pm'`, any day with a PM handoff-time exception
 * is attributed to the exception's claimer; otherwise the resolved owner wins.
 * For v1, we simply count resolved owners — exception start/end times are
 * already reflected in the ResolvedDay.owner via step 2 above.
 */
export interface OwnerCounts {
  parentA: number;
  parentB: number;
  both: number;
  neither: number;
}

export function countDays(resolved: ResolvedDay[]): OwnerCounts {
  const counts: OwnerCounts = { parentA: 0, parentB: 0, both: 0, neither: 0 };
  for (const d of resolved) {
    if (d.owner === 'A') counts.parentA++;
    else if (d.owner === 'B') counts.parentB++;
    else if (d.owner === 'both') counts.both++;
    else counts.neither++;
  }
  return counts;
}

/**
 * Convenience: does any date in the range have conflict=true?
 */
export function hasConflicts(resolved: ResolvedDay[]): boolean {
  return resolved.some((d) => d.conflict);
}

/**
 * Extract the concrete list of conflict dates for banners / sheets.
 */
export function conflictDates(resolved: ResolvedDay[]): string[] {
  return resolved.filter((d) => d.conflict).map((d) => d.date);
}

// Silence unused import warning when tree-shaken builds drop fromIsoDate.
void fromIsoDate;
