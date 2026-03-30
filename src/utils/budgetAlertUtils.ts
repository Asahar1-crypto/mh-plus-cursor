import type { Budget } from '@/integrations/supabase/budgetService';
import type { Expense } from '@/contexts/expense/types';
import { getCycleRangeISO } from '@/utils/billingCycleUtils';

export type BudgetAlertStatus = 'warning_90' | 'exceeded';

export interface BudgetAlert {
  status: BudgetAlertStatus;
  label: string;
  budget: number;
  spent: number;
  categories: string[];
}

/**
 * Get budget alerts for a given month - categories that are at 90%+ or exceeded
 */
export function getBudgetAlertsForMonth(
  budgets: Budget[],
  expenses: Expense[],
  month: number,
  year: number,
  billingDay = 1
): BudgetAlert[] {
  const { startISO, endISO } = getCycleRangeISO(billingDay, month, year);

  const relevantExpenses = expenses.filter(
    (e) =>
      ['approved', 'paid'].includes(e.status || '') &&
      e.date >= startISO &&
      e.date <= endISO
  );

  const alerts: BudgetAlert[] = [];
  const seenGroups = new Set<string>();

  for (const b of budgets) {
    const categories = b.categories && b.categories.length > 0 ? b.categories : b.category ? [b.category] : [];
    if (categories.length === 0) continue;

    const groupKey = [...categories].sort().join('|');
    if (seenGroups.has(groupKey)) continue;
    seenGroups.add(groupKey);

    const spent = relevantExpenses
      .filter((e) => categories.includes(e.category || ''))
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const budget = b.monthly_amount;
    if (budget <= 0) continue;

    let status: BudgetAlertStatus | null = null;
    if (spent > budget) status = 'exceeded';
    else if (spent >= budget * 0.9) status = 'warning_90';

    if (status) {
      alerts.push({
        status,
        label: categories.join(', '),
        budget,
        spent,
        categories,
      });
    }
  }

  return alerts;
}
