import { describe, it, expect } from 'vitest';
import {
  getPendingExpenses,
  getApprovedExpenses,
  getPaidExpenses,
  getRejectedExpenses,
  getTotalPending,
  getTotalApproved,
  getExpensesByChild,
  getExpensesByCategory,
  getExpensesByMonth,
  getMonthlyBalance,
} from '../expenseUtils';
import { Expense } from '../types';
import { EXPENSE_STATUS } from '../constants';

// ─── Test helpers ────────────────────────────────────────────────────────────

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: 'exp-1',
  amount: 100,
  description: 'Test expense',
  date: '2026-02-15',
  category: 'food',
  createdBy: 'user-1',
  creatorName: 'Alice',
  paidById: 'user-1',
  paidByName: 'Alice',
  status: EXPENSE_STATUS.PENDING,
  isRecurring: false,
  includeInMonthlyBalance: true,
  splitEqually: false,
  ...overrides,
});

// ─── Status filters ──────────────────────────────────────────────────────────

describe('getPendingExpenses', () => {
  it('returns only pending expenses', () => {
    const expenses = [
      makeExpense({ id: '1', status: EXPENSE_STATUS.PENDING }),
      makeExpense({ id: '2', status: EXPENSE_STATUS.APPROVED }),
      makeExpense({ id: '3', status: EXPENSE_STATUS.PAID }),
    ];
    const result = getPendingExpenses(expenses);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('returns empty array when there are no pending expenses', () => {
    const expenses = [makeExpense({ status: EXPENSE_STATUS.APPROVED })];
    expect(getPendingExpenses(expenses)).toHaveLength(0);
  });
});

describe('getApprovedExpenses', () => {
  it('returns only approved expenses', () => {
    const expenses = [
      makeExpense({ id: '1', status: EXPENSE_STATUS.PENDING }),
      makeExpense({ id: '2', status: EXPENSE_STATUS.APPROVED }),
    ];
    const result = getApprovedExpenses(expenses);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });
});

describe('getPaidExpenses', () => {
  it('returns only paid expenses', () => {
    const expenses = [
      makeExpense({ id: '1', status: EXPENSE_STATUS.APPROVED }),
      makeExpense({ id: '2', status: EXPENSE_STATUS.PAID }),
    ];
    const result = getPaidExpenses(expenses);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });
});

describe('getRejectedExpenses', () => {
  it('returns only rejected expenses', () => {
    const expenses = [
      makeExpense({ id: '1', status: EXPENSE_STATUS.REJECTED }),
      makeExpense({ id: '2', status: EXPENSE_STATUS.PENDING }),
    ];
    const result = getRejectedExpenses(expenses);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});

// ─── Totals ──────────────────────────────────────────────────────────────────

describe('getTotalPending', () => {
  it('sums the amounts of all pending expenses', () => {
    const expenses = [
      makeExpense({ id: '1', amount: 200, status: EXPENSE_STATUS.PENDING }),
      makeExpense({ id: '2', amount: 150, status: EXPENSE_STATUS.PENDING }),
      makeExpense({ id: '3', amount: 300, status: EXPENSE_STATUS.APPROVED }),
    ];
    expect(getTotalPending(expenses)).toBe(350);
  });

  it('returns 0 when there are no pending expenses', () => {
    const expenses = [makeExpense({ status: EXPENSE_STATUS.PAID })];
    expect(getTotalPending(expenses)).toBe(0);
  });
});

describe('getTotalApproved', () => {
  it('sums the amounts of all approved expenses', () => {
    const expenses = [
      makeExpense({ id: '1', amount: 500, status: EXPENSE_STATUS.APPROVED }),
      makeExpense({ id: '2', amount: 250, status: EXPENSE_STATUS.APPROVED }),
      makeExpense({ id: '3', amount: 100, status: EXPENSE_STATUS.PENDING }),
    ];
    expect(getTotalApproved(expenses)).toBe(750);
  });
});

// ─── Dimension filters ───────────────────────────────────────────────────────

describe('getExpensesByChild', () => {
  it('returns only expenses for the given child', () => {
    const expenses = [
      makeExpense({ id: '1', childId: 'child-A' }),
      makeExpense({ id: '2', childId: 'child-B' }),
      makeExpense({ id: '3', childId: 'child-A' }),
    ];
    const result = getExpensesByChild(expenses, 'child-A');
    expect(result).toHaveLength(2);
    result.forEach(e => expect(e.childId).toBe('child-A'));
  });

  it('returns empty array when no match', () => {
    const expenses = [makeExpense({ childId: 'child-X' })];
    expect(getExpensesByChild(expenses, 'child-Y')).toHaveLength(0);
  });
});

describe('getExpensesByCategory', () => {
  it('returns only expenses for the given category', () => {
    const expenses = [
      makeExpense({ id: '1', category: 'food' }),
      makeExpense({ id: '2', category: 'transport' }),
      makeExpense({ id: '3', category: 'food' }),
    ];
    const result = getExpensesByCategory(expenses, 'food');
    expect(result).toHaveLength(2);
    result.forEach(e => expect(e.category).toBe('food'));
  });
});

describe('getExpensesByMonth', () => {
  it('returns only expenses in the given month and year', () => {
    const expenses = [
      makeExpense({ id: '1', date: '2026-02-10' }),
      makeExpense({ id: '2', date: '2026-01-20' }),
      makeExpense({ id: '3', date: '2026-02-28' }),
    ];
    // February is month index 1
    const result = getExpensesByMonth(expenses, 1, 2026);
    expect(result).toHaveLength(2);
    result.forEach(e => {
      const d = new Date(e.date);
      expect(d.getMonth()).toBe(1);
      expect(d.getFullYear()).toBe(2026);
    });
  });

  it('returns empty array when no expense falls in the given month', () => {
    const expenses = [makeExpense({ date: '2026-03-05' })];
    expect(getExpensesByMonth(expenses, 1, 2026)).toHaveLength(0);
  });
});

// ─── Monthly balance ─────────────────────────────────────────────────────────

describe('getMonthlyBalance', () => {
  it('includes only approved expenses with includeInMonthlyBalance=true for the current month', () => {
    const now = new Date();
    const currentMonthDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15`;

    const expenses: Expense[] = [
      makeExpense({ id: '1', amount: 400, status: EXPENSE_STATUS.APPROVED, includeInMonthlyBalance: true, date: currentMonthDate }),
      makeExpense({ id: '2', amount: 200, status: EXPENSE_STATUS.APPROVED, includeInMonthlyBalance: false, date: currentMonthDate }),
      makeExpense({ id: '3', amount: 100, status: EXPENSE_STATUS.PENDING, includeInMonthlyBalance: true, date: currentMonthDate }),
    ];
    // Only expense #1 should count
    expect(getMonthlyBalance(expenses)).toBe(400);
  });

  it('returns 0 when there are no qualifying expenses', () => {
    expect(getMonthlyBalance([])).toBe(0);
  });
});
