import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { custodyAuditService } from '@/integrations/supabase/custodyService';
import type { CustodyAuditRow } from '@/integrations/supabase/custodyTypes';

/**
 * Returns the set of dates that have recent (within `lookbackDays`) audit
 * entries, so the calendar can render a "שונה" badge on them.
 */
export function useRecentEditedDates(lookbackDays = 30) {
  const { account } = useAuth();
  return useQuery<Set<string>>({
    queryKey: ['custody-audit-recent', account?.id, lookbackDays],
    enabled: Boolean(account?.id),
    queryFn: async () => {
      if (!account?.id) return new Set<string>();
      const since = new Date();
      since.setDate(since.getDate() - lookbackDays);
      const rows = await custodyAuditService.list({
        accountId: account.id,
        since: since.toISOString(),
        target: 'exception',
        limit: 500,
      });
      const set = new Set<string>();
      for (const r of rows) {
        if (r.event_date) set.add(r.event_date);
      }
      return set;
    },
  });
}

/**
 * Fetches the full audit history for a single event_date (for the timeline
 * dialog). Returns newest-first.
 */
export function useAuditForDate(eventDate: string | null) {
  const { account } = useAuth();
  return useQuery<CustodyAuditRow[]>({
    queryKey: ['custody-audit-date', account?.id, eventDate],
    enabled: Boolean(account?.id && eventDate),
    queryFn: async () => {
      if (!account?.id || !eventDate) return [];
      const grouped = await custodyAuditService.forEventDates(account.id, [eventDate]);
      return grouped[eventDate] ?? [];
    },
  });
}
