import { describe, it, expect } from 'vitest';
import { calculateBreakdown } from '../expenseCalculations';
import { Expense } from '@/contexts/expense/types';
import { EXPENSE_STATUS } from '@/contexts/expense/constants';

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: 'exp-1',
  amount: 100,
  description: 'Test',
  date: '2026-02-15',
  category: 'food',
  createdBy: 'user-1',
  creatorName: 'Alice',
  paidById: 'alice',
  paidByName: 'Alice',
  status: EXPENSE_STATUS.APPROVED,
  isRecurring: false,
  includeInMonthlyBalance: true,
  splitEqually: false,
  ...overrides,
});

const alice = { user_id: 'alice', user_name: 'Alice' };
const bob = { user_id: 'bob', user_name: 'Bob' };

describe('calculateBreakdown', () => {
  it('returns zero totals for empty expenses', () => {
    const result = calculateBreakdown([], [alice, bob]);
    expect(result.total).toBe(0);
    expect(result.count).toBe(0);
    expect(result.breakdown).toEqual([
      { userName: 'Alice', amount: 0, count: 0 },
      { userName: 'Bob', amount: 0, count: 0 },
    ]);
  });

  it('returns total and count with empty breakdown when no members provided', () => {
    const expenses = [makeExpense({ amount: 50 }), makeExpense({ id: 'exp-2', amount: 30 })];
    const result = calculateBreakdown(expenses);
    expect(result.total).toBe(80);
    expect(result.count).toBe(2);
    expect(result.breakdown).toEqual([]);
  });

  it('returns empty breakdown when members is empty array', () => {
    const expenses = [makeExpense({ amount: 50 })];
    const result = calculateBreakdown(expenses, []);
    expect(result.total).toBe(50);
    expect(result.count).toBe(1);
    expect(result.breakdown).toEqual([]);
  });

  it('assigns full amount to payer when splitEqually=false', () => {
    const expenses = [makeExpense({ amount: 200, paidById: 'alice', splitEqually: false })];
    const result = calculateBreakdown(expenses, [alice, bob]);

    expect(result.total).toBe(200);
    expect(result.count).toBe(1);
    expect(result.breakdown[0]).toEqual({ userName: 'Alice', amount: 200, count: 1 });
    expect(result.breakdown[1]).toEqual({ userName: 'Bob', amount: 0, count: 0 });
  });

  it('splits amount equally between payer and other member when splitEqually=true', () => {
    const expenses = [makeExpense({ amount: 200, paidById: 'alice', splitEqually: true })];
    const result = calculateBreakdown(expenses, [alice, bob]);

    expect(result.total).toBe(200);
    expect(result.breakdown[0]).toEqual({ userName: 'Alice', amount: 100, count: 1 });
    expect(result.breakdown[1]).toEqual({ userName: 'Bob', amount: 100, count: 1 });
  });

  it('handles splitEqually=true when both members pay different amounts', () => {
    const expenses = [
      makeExpense({ id: 'exp-1', amount: 200, paidById: 'alice', splitEqually: true }),
      makeExpense({ id: 'exp-2', amount: 100, paidById: 'bob', splitEqually: true }),
    ];
    const result = calculateBreakdown(expenses, [alice, bob]);

    // Alice: paid 200 split (100) + bob paid 100 split (50) = 150, count=2
    // Bob: alice paid 200 split (100) + paid 100 split (50) = 150, count=2
    expect(result.total).toBe(300);
    expect(result.breakdown[0]).toEqual({ userName: 'Alice', amount: 150, count: 2 });
    expect(result.breakdown[1]).toEqual({ userName: 'Bob', amount: 150, count: 2 });
  });

  it('handles mixed split and non-split expenses correctly', () => {
    const expenses = [
      makeExpense({ id: 'exp-1', amount: 200, paidById: 'alice', splitEqually: true }),
      makeExpense({ id: 'exp-2', amount: 80, paidById: 'bob', splitEqually: false }),
    ];
    const result = calculateBreakdown(expenses, [alice, bob]);

    // Alice: paid 200 split (100) + 0 from bob's non-split = 100, count=1 for split only
    // Wait: bob's expense is not split, so alice gets nothing from it.
    // Alice: 200/2 = 100 (count 1)
    // Bob: 200/2 = 100 (from alice's split, count 1) + 80 full (count 1) = 180, count 2
    expect(result.total).toBe(280);
    expect(result.breakdown[0]).toEqual({ userName: 'Alice', amount: 100, count: 1 });
    expect(result.breakdown[1]).toEqual({ userName: 'Bob', amount: 180, count: 2 });
  });

  it('accumulates multiple expenses from same payer', () => {
    const expenses = [
      makeExpense({ id: 'exp-1', amount: 100, paidById: 'alice', splitEqually: false }),
      makeExpense({ id: 'exp-2', amount: 50, paidById: 'alice', splitEqually: false }),
      makeExpense({ id: 'exp-3', amount: 75, paidById: 'alice', splitEqually: false }),
    ];
    const result = calculateBreakdown(expenses, [alice, bob]);

    expect(result.total).toBe(225);
    expect(result.count).toBe(3);
    expect(result.breakdown[0]).toEqual({ userName: 'Alice', amount: 225, count: 3 });
    expect(result.breakdown[1]).toEqual({ userName: 'Bob', amount: 0, count: 0 });
  });

  it('does not assign split half to members when payer is not in members list', () => {
    const unknownPayer = makeExpense({ amount: 200, paidById: 'charlie', splitEqually: true });
    const result = calculateBreakdown([unknownPayer], [alice, bob]);

    // charlie is not in accountMembers, so the `else if` condition fails:
    // accountMembers.some(m => m.user_id === exp.paidById) is false for 'charlie'
    // Neither alice nor bob paid it, and the split condition requires the payer to be a member
    expect(result.total).toBe(200);
    expect(result.breakdown[0]).toEqual({ userName: 'Alice', amount: 0, count: 0 });
    expect(result.breakdown[1]).toEqual({ userName: 'Bob', amount: 0, count: 0 });
  });

  it('handles single member correctly with non-split expense', () => {
    const expenses = [makeExpense({ amount: 150, paidById: 'alice', splitEqually: false })];
    const result = calculateBreakdown(expenses, [alice]);

    expect(result.total).toBe(150);
    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0]).toEqual({ userName: 'Alice', amount: 150, count: 1 });
  });

  it('handles single member with splitEqually=true (still halves)', () => {
    const expenses = [makeExpense({ amount: 150, paidById: 'alice', splitEqually: true })];
    const result = calculateBreakdown(expenses, [alice]);

    // Alice paid, splitEqually=true, so she gets amount/2 = 75
    // No other member to get the other half
    expect(result.total).toBe(150);
    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0]).toEqual({ userName: 'Alice', amount: 75, count: 1 });
  });

  it('handles decimal amounts with split correctly', () => {
    const expenses = [makeExpense({ amount: 99.99, paidById: 'alice', splitEqually: true })];
    const result = calculateBreakdown(expenses, [alice, bob]);

    expect(result.total).toBe(99.99);
    expect(result.breakdown[0].amount).toBeCloseTo(49.995, 5);
    expect(result.breakdown[1].amount).toBeCloseTo(49.995, 5);
    // Verify both halves sum to the original
    expect(result.breakdown[0].amount + result.breakdown[1].amount).toBeCloseTo(99.99, 5);
  });
});
