import type { Budget } from '@/integrations/supabase/budgetService';
import type { Expense } from '@/contexts/expense/types';

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
  year: number
): BudgetAlert[] {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const monthStartStr = monthStart.toISOString().slice(0, 10);
  const monthEndStr = monthEnd.toISOString().slice(0, 10);

  const relevantExpenses = expenses.filter(
    (e) =>
      ['approved', 'paid'].includes(e.status || '') &&
      e.date >= monthStartStr &&
      e.date <= monthEndStr
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
