/**
 * usePaymentBreakdown — computes per-member balances for the selected
 * billing cycle, plus the net settlement direction.
 *
 * Extracted from MonthlyFoodPaymentCard so the unified HeroBalanceCard
 * (and any future settlement-summary view) can consume the same data
 * without duplicating the math.
 *
 * Rules (preserved verbatim from the original card):
 *   - Only `approved` expenses count. Paid expenses are already settled
 *     out of this calculation; pending/rejected don't yet count.
 *   - For each approved expense, the member tagged as `paidById` owes:
 *       • amount / 2   when splitEqually = true  (50/50 split)
 *       • amount       when splitEqually = false (they cover it all)
 *   - Members with no approved expenses get balance = 0.
 *   - Virtual partners get appended to members so solo accounts still
 *     produce a 2-row breakdown.
 *
 * The hook also computes the total approved-expense amount (which can
 * differ from `currentAmount = approved + paid` shown in the hero — see
 * `outstandingForSplit` consumers).
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { useExpense } from '@/contexts/ExpenseContext';
import { memberService } from '@/contexts/auth/services/account/memberService';
import { isDateInCycle } from '@/utils/billingCycleUtils';

export interface PaymentBreakdownEntry {
  userId: string;
  userName: string;
  /** Positive = owes money, negative = is owed money, ~0 = balanced. */
  balance: number;
}

export interface PaymentBreakdownResult {
  breakdown: PaymentBreakdownEntry[];
  /** Sum of approved expenses for the selected cycle (the "split pool"). */
  totalApproved: number;
  /** balance[0] − balance[1]; only meaningful when hasNetCalc is true. */
  netDifference: number;
  /** True when at least 2 members are known (real + virtual counted). */
  hasNetCalc: boolean;
  isLoading: boolean;
}

export function usePaymentBreakdown(
  selectedMonth: string | undefined,
  billingDay = 1,
): PaymentBreakdownResult {
  const { expenses } = useExpense();
  const { account } = useAuth();

  const { data: accountMembers, isLoading: membersLoading } = useQuery({
    queryKey: ['account-members', account?.id],
    queryFn: () => memberService.getAccountMembers(account!.id),
    enabled: !!account?.id,
  });

  const effectiveMembers = useMemo(() => {
    if (!accountMembers) return accountMembers;
    const hasVirtualPartner =
      accountMembers.length === 1 &&
      !!account?.virtual_partner_name &&
      !!account?.virtual_partner_id;
    if (hasVirtualPartner) {
      return [
        ...accountMembers,
        {
          user_id: account!.virtual_partner_id!,
          user_name: account!.virtual_partner_name!,
          role: 'member' as const,
          joined_at: '',
        },
      ];
    }
    return accountMembers;
  }, [accountMembers, account?.virtual_partner_id, account?.virtual_partner_name]);

  return useMemo<PaymentBreakdownResult>(() => {
    if (!effectiveMembers) {
      return {
        breakdown: [],
        totalApproved: 0,
        netDifference: 0,
        hasNetCalc: false,
        isLoading: membersLoading,
      };
    }

    // Parse month or fall back to current calendar month
    let targetMonth: number;
    let targetYear: number;
    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number);
      targetMonth = month;
      targetYear = year;
    } else {
      const now = new Date();
      targetMonth = now.getMonth() + 1;
      targetYear = now.getFullYear();
    }

    // Approved expenses inside the cycle = the split pool
    const inCycleApproved = expenses.filter(
      (e) =>
        e.status === 'approved' &&
        isDateInCycle(e.date, billingDay, targetMonth, targetYear),
    );

    const breakdown: PaymentBreakdownEntry[] = effectiveMembers.map((member) => {
      let owes = 0;
      for (const expense of inCycleApproved) {
        if (expense.paidById === member.user_id) {
          owes += expense.splitEqually ? expense.amount / 2 : expense.amount;
        }
      }
      return {
        userId: member.user_id,
        userName: member.user_name,
        balance: owes,
      };
    });

    const totalApproved = inCycleApproved.reduce((sum, e) => sum + e.amount, 0);
    const hasNetCalc = breakdown.length >= 2;
    const netDifference = hasNetCalc ? breakdown[0].balance - breakdown[1].balance : 0;

    return {
      breakdown,
      totalApproved,
      netDifference,
      hasNetCalc,
      isLoading: false,
    };
  }, [effectiveMembers, expenses, selectedMonth, billingDay, membersLoading]);
}
