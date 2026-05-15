import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import {
  custodyAgreementService,
  custodyExceptionService,
  custodyPatternService,
} from '@/integrations/supabase/custodyService';
import { schoolCalendarService } from '@/integrations/supabase/schoolCalendarService';
import type {
  CustodyAgreementRow,
  CustodyExceptionRow,
  CustodyPatternRow,
  EducationLevel,
  SchoolCalendarEventRow,
} from '@/integrations/supabase/custodyTypes';

export interface CustodyDataBundle {
  myPattern: CustodyPatternRow | null;
  partnerPattern: CustodyPatternRow | null;
  myUserId: string | null;
  partnerUserId: string | null;
  partnerName: string | null;
  exceptions: CustodyExceptionRow[];
  agreement: CustodyAgreementRow | null;
  schoolEvents: SchoolCalendarEventRow[];
  /** Education levels used by the account's children (for school_calendar filtering). */
  activeEducationLevels: EducationLevel[];
  isSoloParent: boolean;
}

interface UseCustodyDataOptions {
  rangeFromIso: string;
  rangeToIso: string;
}

/**
 * Loads every piece of data needed to render the custody calendar for a
 * given date range: own pattern, partner's pattern (if any), exceptions in
 * range, agreement state, and the relevant school_calendar_events.
 */
export function useCustodyData({ rangeFromIso, rangeToIso }: UseCustodyDataOptions) {
  const { user, account } = useAuth();

  return useQuery<CustodyDataBundle>({
    queryKey: ['custody-data', account?.id, rangeFromIso, rangeToIso],
    enabled: Boolean(user?.id && account?.id),
    queryFn: async () => {
      if (!user?.id || !account?.id) {
        throw new Error('Not authenticated');
      }

      // 1. Load all patterns for this account (usually 1 or 2 rows).
      const patterns = await custodyPatternService.listByAccount(account.id);

      const myPattern = patterns.find((p) => p.owner_user_id === user.id) ?? null;
      const partnerPattern =
        patterns.find((p) => p.owner_user_id !== user.id) ?? null;

      // 2. Resolve partner's user id + display name.
      let partnerUserId: string | null = partnerPattern?.owner_user_id ?? null;
      let partnerName: string | null = null;

      if (!partnerUserId) {
        // No partner pattern yet — check account_members for another adult.
        const { data: members } = await supabase
          .from('account_members')
          .select('user_id, profiles:profiles!user_id(name)')
          .eq('account_id', account.id);
        const other = (members ?? []).find(
          (m: { user_id: string }) => m.user_id !== user.id,
        );
        if (other) {
          partnerUserId = other.user_id;
          partnerName =
            (other as unknown as { profiles?: { name?: string } }).profiles?.name ?? null;
        }
      } else {
        const { data: prof } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', partnerUserId)
          .maybeSingle();
        partnerName = prof?.name ?? null;
      }

      if (!partnerName) {
        partnerName = account.virtual_partner_name ?? null;
      }

      const isSoloParent = partnerUserId === null && !account.virtual_partner_name;

      // 3. Load exceptions in range.
      const exceptions = await custodyExceptionService.list({
        accountId: account.id,
        from: rangeFromIso,
        to: rangeToIso,
      });

      // 4. Load agreement state (single row per account).
      const agreement = await custodyAgreementService.get(account.id);

      // 5. Load children to derive applicable education levels.
      const { data: children } = await supabase
        .from('children')
        .select('education_level')
        .eq('account_id', account.id);
      const levelSet = new Set<EducationLevel>();
      for (const c of (children ?? []) as { education_level: EducationLevel | null }[]) {
        if (c.education_level) levelSet.add(c.education_level);
      }
      const activeEducationLevels = Array.from(levelSet);

      // 6. Load school_calendar_events that overlap the range. We filter by
      //    year labels inferred from the range on the client for simplicity.
      const years = yearsInRange(rangeFromIso, rangeToIso);
      const calendarsPerYear = await Promise.all(
        years.map((y) =>
          schoolCalendarService.list({ schoolYear: y, from: rangeFromIso, to: rangeToIso }),
        ),
      );
      const schoolEvents = calendarsPerYear.flat();

      return {
        myPattern,
        partnerPattern,
        myUserId: user.id,
        partnerUserId,
        partnerName,
        exceptions,
        agreement,
        schoolEvents,
        activeEducationLevels,
        isSoloParent,
      } satisfies CustodyDataBundle;
    },
  });
}

function yearsInRange(fromIso: string, toIso: string): string[] {
  const out = new Set<string>();
  out.add(schoolYearForIso(fromIso));
  out.add(schoolYearForIso(toIso));
  return Array.from(out);
}

function schoolYearForIso(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  const start = m >= 9 ? y : y - 1;
  return `${start}-${start + 1}`;
}
