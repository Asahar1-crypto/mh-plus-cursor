import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { custodyProposalService } from '@/integrations/supabase/custodyProposalService';
import type { CustodyProposalRow } from '@/integrations/supabase/custodyTypes';

/**
 * Loads all non-expired proposals for the current account. UI filters them
 * by recipient/proposer as needed.
 */
export function useCustodyProposals() {
  const { account } = useAuth();
  return useQuery<CustodyProposalRow[]>({
    queryKey: ['custody-proposals', account?.id],
    enabled: Boolean(account?.id),
    queryFn: async () => {
      if (!account?.id) return [];
      return custodyProposalService.listByAccount(account.id, { status: 'pending' });
    },
  });
}
