import { supabase } from '@/integrations/supabase/client';

export type BudgetCheckStatus = 'ok' | 'warning_90' | 'exceeded';

export interface BudgetCheckResult {
  status: BudgetCheckStatus;
  budget: number;
  spent: number;
  newSpent: number;
}

export async function checkBudgetBeforeExpense(
  accountId: string,
  category: string,
  amount: number,
  expenseDate?: string
): Promise<BudgetCheckResult> {
  const { data, error } = await supabase.functions.invoke('check-budget-before-expense', {
    body: { accountId, category, amount, expenseDate },
  });

  if (error) {
    throw error;
  }

  return data as BudgetCheckResult;
}
