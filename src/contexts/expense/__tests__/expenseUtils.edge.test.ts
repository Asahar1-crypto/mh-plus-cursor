import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  getPendingExpenses,
  getTotalPending,
  getTotalApproved,
  getRecurringExpenses,
  getNonRecurringExpenses,
  getActiveRecurringExpenses,
} from '../expenseUtils';
import { Expense } from '../types';
import { EXPENSE_STATUS } from '../constants';

// ─── עזרים לטסטים ──────────────────────────────────────────────────────────

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

// ─── הוצאות ממתינות - סינון חוזרות ─────────────────────────────────────────

describe('getPendingExpenses – recurring exclusion', () => {
  it('excludes recurring expenses even if status is pending', () => {
    const expenses = [
      makeExpense({ id: '1', status: EXPENSE_STATUS.PENDING, isRecurring: true }),
      makeExpense({ id: '2', status: EXPENSE_STATUS.PENDING, isRecurring: false }),
    ];
    const result = getPendingExpenses(expenses);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('returns empty when all pending expenses are recurring', () => {
    const expenses = [
      makeExpense({ id: '1', status: EXPENSE_STATUS.PENDING, isRecurring: true }),
      makeExpense({ id: '2', status: EXPENSE_STATUS.PENDING, isRecurring: true }),
    ];
    expect(getPendingExpenses(expenses)).toHaveLength(0);
  });

  it('excludes recurring regardless of other fields', () => {
    const expenses = [
      makeExpense({
        id: '1',
        status: EXPENSE_STATUS.PENDING,
        isRecurring: true,
        amount: 5000,
        category: 'rent',
        childId: 'child-1',
      }),
    ];
    expect(getPendingExpenses(expenses)).toHaveLength(0);
  });
});

// ─── סכומים עשרוניים ────────────────────────────────────────────────────────

describe('Decimal amounts', () => {
  it('getTotalPending handles decimal amounts correctly', () => {
    const expenses = [
      makeExpense({ id: '1', amount: 99.99, status: EXPENSE_STATUS.PENDING }),
      makeExpense({ id: '2', amount: 50.50, status: EXPENSE_STATUS.PENDING }),
    ];
    const total = getTotalPending(expenses);
    expect(total).toBeCloseTo(150.49, 2);
  });

  it('getTotalApproved handles decimal amounts correctly', () => {
    const expenses = [
      makeExpense({ id: '1', amount: 33.33, status: EXPENSE_STATUS.APPROVED }),
      makeExpense({ id: '2', amount: 66.67, status: EXPENSE_STATUS.APPROVED }),
    ];
    const total = getTotalApproved(expenses);
    expect(total).toBeCloseTo(100.00, 2);
  });

  it('handles very small decimal amounts', () => {
    const expenses = [
      makeExpense({ id: '1', amount: 0.01, status: EXPENSE_STATUS.PENDING }),
      makeExpense({ id: '2', amount: 0.02, status: EXPENSE_STATUS.PENDING }),
    ];
    expect(getTotalPending(expenses)).toBeCloseTo(0.03, 2);
  });
});

// ─── הוצאות חוזרות ──────────────────────────────────────────────────────────

describe('getRecurringExpenses', () => {
  it('returns only recurring expenses', () => {
    const expenses = [
      makeExpense({ id: '1', isRecurring: true }),
      makeExpense({ id: '2', isRecurring: false }),
      makeExpense({ id: '3', isRecurring: true }),
    ];
    const result = getRecurringExpenses(expenses);
    expect(result).toHaveLength(2);
    expect(result.map(e => e.id)).toEqual(['1', '3']);
  });

  it('returns empty array when no recurring expenses exist', () => {
    const expenses = [
      makeExpense({ id: '1', isRecurring: false }),
      makeExpense({ id: '2', isRecurring: false }),
    ];
    expect(getRecurringExpenses(expenses)).toHaveLength(0);
  });

  it('returns all expenses when all are recurring', () => {
    const expenses = [
      makeExpense({ id: '1', isRecurring: true }),
      makeExpense({ id: '2', isRecurring: true }),
    ];
    expect(getRecurringExpenses(expenses)).toHaveLength(2);
  });
});

// ─── הוצאות לא חוזרות ──────────────────────────────────────────────────────

describe('getNonRecurringExpenses', () => {
  it('returns only non-recurring expenses', () => {
    const expenses = [
      makeExpense({ id: '1', isRecurring: true }),
      makeExpense({ id: '2', isRecurring: false }),
      makeExpense({ id: '3', isRecurring: false }),
    ];
    const result = getNonRecurringExpenses(expenses);
    expect(result).toHaveLength(2);
    expect(result.map(e => e.id)).toEqual(['2', '3']);
  });

  it('returns empty array when all expenses are recurring', () => {
    const expenses = [
      makeExpense({ id: '1', isRecurring: true }),
    ];
    expect(getNonRecurringExpenses(expenses)).toHaveLength(0);
  });

  it('returns all expenses when none are recurring', () => {
    const expenses = [
      makeExpense({ id: '1', isRecurring: false }),
      makeExpense({ id: '2', isRecurring: false }),
    ];
    expect(getNonRecurringExpenses(expenses)).toHaveLength(2);
  });
});

// ─── הוצאות חוזרות פעילות ───────────────────────────────────────────────────

describe('getActiveRecurringExpenses', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('includes recurring expense with no end date', () => {
    const expenses = [
      makeExpense({ id: '1', isRecurring: true, hasEndDate: false }),
    ];
    const result = getActiveRecurringExpenses(expenses);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('includes recurring expense where hasEndDate is undefined', () => {
    const expenses = [
      makeExpense({ id: '1', isRecurring: true }),
    ];
    const result = getActiveRecurringExpenses(expenses);
    expect(result).toHaveLength(1);
  });

  it('includes recurring expense with end date in the future', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01'));

    const expenses = [
      makeExpense({ id: '1', isRecurring: true, hasEndDate: true, endDate: '2026-06-01' }),
    ];
    const result = getActiveRecurringExpenses(expenses);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('excludes recurring expense with end date in the past', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01'));

    const expenses = [
      makeExpense({ id: '1', isRecurring: true, hasEndDate: true, endDate: '2026-01-15' }),
    ];
    const result = getActiveRecurringExpenses(expenses);
    expect(result).toHaveLength(0);
  });

  it('includes recurring expense with end date equal to today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T00:00:00.000Z'));

    const expenses = [
      makeExpense({ id: '1', isRecurring: true, hasEndDate: true, endDate: '2026-03-01' }),
    ];
    const result = getActiveRecurringExpenses(expenses);
    expect(result).toHaveLength(1);
  });

  it('filters mixed active and expired recurring expenses', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15'));

    const expenses = [
      makeExpense({ id: '1', isRecurring: true, hasEndDate: false }),
      makeExpense({ id: '2', isRecurring: true, hasEndDate: true, endDate: '2026-01-01' }),
      makeExpense({ id: '3', isRecurring: true, hasEndDate: true, endDate: '2026-12-31' }),
      makeExpense({ id: '4', isRecurring: false }),
    ];
    const result = getActiveRecurringExpenses(expenses);
    expect(result).toHaveLength(2);
    expect(result.map(e => e.id)).toEqual(['1', '3']);
  });

  it('excludes non-recurring expenses entirely', () => {
    const expenses = [
      makeExpense({ id: '1', isRecurring: false }),
      makeExpense({ id: '2', isRecurring: false }),
    ];
    expect(getActiveRecurringExpenses(expenses)).toHaveLength(0);
  });

  it('includes recurring expense where hasEndDate is true but endDate is undefined', () => {
    const expenses = [
      makeExpense({ id: '1', isRecurring: true, hasEndDate: true, endDate: undefined }),
    ];
    // hasEndDate=true but no actual endDate -> condition !expense.hasEndDate is false,
    // but !expense.endDate is true, so it returns true
    const result = getActiveRecurringExpenses(expenses);
    expect(result).toHaveLength(1);
  });
});

// ─── מקרי קצה - מערכים ריקים ────────────────────────────────────────────────

describe('Empty array edge cases', () => {
  it('getPendingExpenses returns [] for empty input', () => {
    expect(getPendingExpenses([])).toEqual([]);
  });

  it('getTotalPending returns 0 for empty input', () => {
    expect(getTotalPending([])).toBe(0);
  });

  it('getTotalApproved returns 0 for empty input', () => {
    expect(getTotalApproved([])).toBe(0);
  });

  it('getRecurringExpenses returns [] for empty input', () => {
    expect(getRecurringExpenses([])).toEqual([]);
  });

  it('getNonRecurringExpenses returns [] for empty input', () => {
    expect(getNonRecurringExpenses([])).toEqual([]);
  });

  it('getActiveRecurringExpenses returns [] for empty input', () => {
    expect(getActiveRecurringExpenses([])).toEqual([]);
  });
});
