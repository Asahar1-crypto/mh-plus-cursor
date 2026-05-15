import { useMemo } from 'react';
import { resolveSchedule } from '@/lib/custody/resolveSchedule';
import type { ResolvedDay } from '@/integrations/supabase/custodyTypes';
import type { CustodyDataBundle } from './useCustodyData';

interface UseResolvedScheduleArgs {
  data: CustodyDataBundle | undefined;
  rangeFromIso: string;
  rangeToIso: string;
  recentlyEditedDates?: Set<string>;
}

/** Memoized wrapper around resolveSchedule() that adapts our data bundle. */
export function useResolvedSchedule({
  data,
  rangeFromIso,
  rangeToIso,
  recentlyEditedDates,
}: UseResolvedScheduleArgs): ResolvedDay[] {
  return useMemo(() => {
    if (!data) return [];
    return resolveSchedule({
      rangeFromIso,
      rangeToIso,
      parentA: data.myPattern,
      parentB: data.partnerPattern,
      parentAUserId: data.myUserId,
      parentBUserId: data.partnerUserId,
      exceptions: data.exceptions,
      recentlyEditedDates,
    });
  }, [data, rangeFromIso, rangeToIso, recentlyEditedDates]);
}
