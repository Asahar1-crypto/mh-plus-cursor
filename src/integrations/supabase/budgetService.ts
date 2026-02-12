import { supabase } from './client';
import { Account } from '@/contexts/auth/types';

export interface Budget {
  id: string;
  account_id: string;
  category: string | null;
  categories: string[] | null;
  monthly_amount: number;
  month: number | null;
  year: number | null;
  budget_type: 'monthly' | 'recurring';
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface AddBudgetInput {
  budgetType: 'monthly' | 'recurring';
  category?: string;
  categories?: string[];
  monthlyAmount: number;
  month?: number;
  year?: number;
  startDate?: string;
  endDate?: string;
}

/** Check if budget applies to a given category */
function budgetAppliesToCategory(b: Budget, category: string): boolean {
  if (b.categories && b.categories.length > 0) {
    return b.categories.includes(category);
  }
  return b.category === category;
}

/** Get first day of month as ISO string */
function monthStart(month: number, year: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

/** Get last day of month */
function monthEnd(month: number, year: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

export const budgetService = {
  /** Get budgets for a specific month (monthly + recurring that apply) */
  async getBudgets(
    account: Account,
    month?: number,
    year?: number
  ): Promise<Budget[]> {
    const now = new Date();
    const m = month ?? now.getMonth() + 1;
    const y = year ?? now.getFullYear();
    const monthStartStr = monthStart(m, y);
    const monthEndStr = monthEnd(m, y);

    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('account_id', account.id);

    if (error) {
      console.error('Error fetching budgets:', error);
      throw error;
    }

    const all = (data || []) as Budget[];
    return all.filter((b) => {
      if (b.budget_type === 'monthly') {
        return b.month === m && b.year === y;
      }
      // recurring
      if (!b.start_date) return false;
      const start = b.start_date;
      const end = b.end_date ?? '9999-12-31';
      return start <= monthEndStr && end >= monthStartStr;
    });
  },

  /** Get total budget amount for a category in a month (for all matching budgets) */
  async getBudgetForCategory(
    account: Account,
    category: string,
    month: number,
    year: number
  ): Promise<number> {
    const budgets = await this.getBudgets(account, month, year);
    return budgets
      .filter((b) => budgetAppliesToCategory(b, category))
      .reduce((sum, b) => sum + b.monthly_amount, 0);
  },

  /** Get all budgets for month - for overview display */
  async getBudgetsForMonth(
    account: Account,
    month: number,
    year: number
  ): Promise<Budget[]> {
    return this.getBudgets(account, month, year);
  },

  async addBudget(account: Account, input: AddBudgetInput): Promise<Budget> {
    const payload: Record<string, unknown> = {
      account_id: account.id,
      monthly_amount: input.monthlyAmount,
      budget_type: input.budgetType,
    };

    if (input.budgetType === 'monthly') {
      payload.month = input.month ?? new Date().getMonth() + 1;
      payload.year = input.year ?? new Date().getFullYear();
      if (input.categories && input.categories.length > 0) {
        payload.categories = input.categories;
        payload.category = null;
      } else {
        payload.category = input.category ?? '';
        payload.categories = null;
      }
    } else {
      payload.start_date = input.startDate ?? new Date().toISOString().slice(0, 10);
      payload.end_date = input.endDate ?? null;
      payload.month = null;
      payload.year = null;
      if (input.categories && input.categories.length > 0) {
        payload.categories = input.categories;
        payload.category = null;
      } else {
        payload.category = input.category ?? '';
        payload.categories = null;
      }
    }

    const { data, error } = await supabase
      .from('budgets')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error adding budget:', error);
      throw error;
    }

    return data as Budget;
  },

  async updateBudget(
    account: Account,
    id: string,
    updates: Partial<{
      monthly_amount: number;
      category: string;
      categories: string[];
      month: number;
      year: number;
      start_date: string;
      end_date: string;
    }>
  ): Promise<void> {
    const { error } = await supabase
      .from('budgets')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('account_id', account.id);

    if (error) {
      console.error('Error updating budget:', error);
      throw error;
    }
  },

  async deleteBudget(account: Account, id: string): Promise<void> {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id)
      .eq('account_id', account.id);

    if (error) {
      console.error('Error deleting budget:', error);
      throw error;
    }
  },
};
