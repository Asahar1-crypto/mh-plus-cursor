import { supabase } from './client';
import type {
  ConflictResolutionPayload,
  CustodyProposalPayload,
  CustodyProposalRow,
  HistoricalEditPayload,
  SwapPayload,
} from './custodyTypes';
import { custodyExceptionService } from './custodyService';

export const DAYS_EDITABLE_WINDOW = 30;

export interface CreateProposalInput {
  accountId: string;
  proposerId: string;
  recipientId: string;
  payload: CustodyProposalPayload;
  note?: string | null;
}

export const custodyProposalService = {
  async listByAccount(
    accountId: string,
    opts: { status?: CustodyProposalRow['status'] } = {},
  ): Promise<CustodyProposalRow[]> {
    let query = supabase
      .from('custody_proposals')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });
    if (opts.status) query = query.eq('status', opts.status);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as CustodyProposalRow[];
  },

  async create(input: CreateProposalInput): Promise<CustodyProposalRow> {
    const row = {
      account_id: input.accountId,
      proposer_id: input.proposerId,
      recipient_id: input.recipientId,
      kind: input.payload.kind,
      payload: input.payload,
      note: input.note ?? null,
    };
    const { data, error } = await supabase
      .from('custody_proposals')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return data as CustodyProposalRow;
  },

  async reject(proposalId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('custody_proposals')
      .update({
        status: 'rejected',
        decided_at: new Date().toISOString(),
        decided_by: userId,
      })
      .eq('id', proposalId);
    if (error) throw error;
  },

  /**
   * Accept a proposal: apply its effects to custody_exceptions, then mark
   * the proposal itself as accepted. Not atomic in the strict sense — if
   * the exception write succeeds but the status update fails, the user
   * will see the calendar update but a stale "pending" pill; re-running
   * resolves it.
   */
  async accept(proposal: CustodyProposalRow, userId: string): Promise<void> {
    if (proposal.kind === 'swap') {
      await applySwap(proposal, userId);
    } else if (proposal.kind === 'conflict_resolution') {
      await applyConflictResolution(proposal, userId);
    }
    // Historical edits are applied unilaterally by the editor at write time;
    // the proposal is informational only (to notify the other parent).

    const { error } = await supabase
      .from('custody_proposals')
      .update({
        status: 'accepted',
        decided_at: new Date().toISOString(),
        decided_by: userId,
      })
      .eq('id', proposal.id);
    if (error) throw error;
  },
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

async function applySwap(proposal: CustodyProposalRow, userId: string) {
  const payload = proposal.payload as SwapPayload;
  // Two "one_off" exceptions, each claiming the other date for the other parent.
  const rows = [
    {
      account_id: proposal.account_id,
      kind: 'one_off' as const,
      event_name: 'החלפת יום',
      parent_event: 'swap',
      claimed_by: proposal.recipient_id,
      start_date: payload.from_date,
      end_date: payload.from_date,
      notes: proposal.note ?? null,
      created_by: userId,
    },
    {
      account_id: proposal.account_id,
      kind: 'one_off' as const,
      event_name: 'החלפת יום',
      parent_event: 'swap',
      claimed_by: proposal.proposer_id,
      start_date: payload.to_date,
      end_date: payload.to_date,
      notes: proposal.note ?? null,
      created_by: userId,
    },
  ];
  const { error } = await supabase.from('custody_exceptions').insert(rows);
  if (error) throw error;
}

async function applyConflictResolution(proposal: CustodyProposalRow, userId: string) {
  const payload = proposal.payload as ConflictResolutionPayload;
  // Mark the date as resolved: insert a one_off exception with the winner.
  const mainRow = {
    account_id: proposal.account_id,
    kind: 'one_off' as const,
    event_name: 'פתרון התנגשות',
    parent_event: 'conflict_resolution',
    claimed_by: payload.winner_user_id,
    start_date: payload.conflict_date,
    end_date: payload.conflict_date,
    notes: proposal.note ?? null,
    created_by: userId,
  };
  const rows: typeof mainRow[] = [mainRow];
  if (payload.swap_counter_date) {
    // The "loser" of the conflict gets this day in return.
    const loserId =
      payload.winner_user_id === proposal.proposer_id
        ? proposal.recipient_id
        : proposal.proposer_id;
    rows.push({
      account_id: proposal.account_id,
      kind: 'one_off',
      event_name: 'יום תמורה',
      parent_event: 'conflict_resolution',
      claimed_by: loserId,
      start_date: payload.swap_counter_date,
      end_date: payload.swap_counter_date,
      notes: proposal.note ?? null,
      created_by: userId,
    });
  }
  const { error } = await supabase.from('custody_exceptions').insert(rows);
  if (error) throw error;
}

// -----------------------------------------------------------------------------
// Helpers for callers
// -----------------------------------------------------------------------------

export function isWithinEditWindow(dateIso: string, today: Date = new Date()): boolean {
  const [y, m, d] = dateIso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const diffDays = Math.floor((today.getTime() - date.getTime()) / 86_400_000);
  // Future dates are always editable; past dates only within DAYS_EDITABLE_WINDOW.
  return diffDays <= DAYS_EDITABLE_WINDOW;
}

export function daysAgo(dateIso: string, today: Date = new Date()): number {
  const [y, m, d] = dateIso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return Math.floor((today.getTime() - date.getTime()) / 86_400_000);
}

export { custodyExceptionService };

export type { HistoricalEditPayload };
