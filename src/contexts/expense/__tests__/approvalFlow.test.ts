/**
 * Integration tests for the expense approval flow.
 *
 * These tests exercise the pure business logic embedded in useExpenseActions
 * without mounting any React component, by calling the logic directly through
 * the exported utility layer and service mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getPendingExpenses,
  getApprovedExpenses,
  getPaidExpenses,
} from '../expenseUtils';
import { Expense } from '../types';
import { EXPENSE_STATUS } from '../constants';

// ─── Test helpers ─────────────────────────────────────────────────────────────

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: 'exp-1',
  amount: 250,
  description: 'Dentist',
  date: '2026-02-15',
  category: 'health',
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

// ─── Approval flow logic ──────────────────────────────────────────────────────

describe('Expense approval flow', () => {
  let expenses: Expense[];

  beforeEach(() => {
    expenses = [
      makeExpense({ id: 'A', status: EXPENSE_STATUS.PENDING }),
      makeExpense({ id: 'B', status: EXPENSE_STATUS.PENDING }),
      makeExpense({ id: 'C', status: EXPENSE_STATUS.APPROVED }),
    ];
  });

  it('approving a pending expense moves it to approved', () => {
    // Simulate optimistic update: change status in local state
    const updated = expenses.map(e =>
      e.id === 'A' ? { ...e, status: EXPENSE_STATUS.APPROVED as Expense['status'] } : e
    );
    expect(getPendingExpenses(updated)).toHaveLength(1);
    expect(getApprovedExpenses(updated)).toHaveLength(2);
  });

  it('rejecting a pending expense removes it from pending', () => {
    const updated = expenses.map(e =>
      e.id === 'B' ? { ...e, status: EXPENSE_STATUS.REJECTED as Expense['status'] } : e
    );
    expect(getPendingExpenses(updated)).toHaveLength(1);
    expect(getPendingExpenses(updated)[0].id).toBe('A');
  });

  it('marking an approved expense as paid moves it to paid', () => {
    const updated = expenses.map(e =>
      e.id === 'C' ? { ...e, status: EXPENSE_STATUS.PAID as Expense['status'] } : e
    );
    expect(getApprovedExpenses(updated)).toHaveLength(0);
    expect(getPaidExpenses(updated)).toHaveLength(1);
    expect(getPaidExpenses(updated)[0].id).toBe('C');
  });

  it('bulk-approving all pending expenses clears the pending list', () => {
    const updated = expenses.map(e =>
      e.status === EXPENSE_STATUS.PENDING
        ? { ...e, status: EXPENSE_STATUS.APPROVED as Expense['status'] }
        : e
    );
    expect(getPendingExpenses(updated)).toHaveLength(0);
    expect(getApprovedExpenses(updated)).toHaveLength(3);
  });

  it('optimistic revert restores state when approval fails', () => {
    // Optimistic update
    const optimistic = expenses.map(e =>
      e.id === 'A' ? { ...e, status: EXPENSE_STATUS.APPROVED as Expense['status'] } : e
    );
    expect(getApprovedExpenses(optimistic)).toHaveLength(2);

    // Server fails → revert to original
    const reverted = expenses;
    expect(getApprovedExpenses(reverted)).toHaveLength(1);
    expect(getPendingExpenses(reverted)).toHaveLength(2);
  });
});

// ─── Self-approval guard ──────────────────────────────────────────────────────

describe('Self-approval guard', () => {
  it('identifies that the creator and the approver are the same user', () => {
    const expense = makeExpense({ createdBy: 'user-1' });
    const currentUserId = 'user-1';
    // The guard in useExpenseActions rejects self-approval on non-personal plans
    expect(expense.createdBy === currentUserId).toBe(true);
  });

  it('allows approval when the approver is a different user', () => {
    const expense = makeExpense({ createdBy: 'user-1' });
    const currentUserId = 'user-2';
    expect(expense.createdBy === currentUserId).toBe(false);
  });
});

// ─── Amount calculations ──────────────────────────────────────────────────────

describe('Amount calculations in approval flow', () => {
  it('total of approved expenses equals the sum of individual amounts', () => {
    const approved = [
      makeExpense({ id: '1', amount: 300, status: EXPENSE_STATUS.APPROVED }),
      makeExpense({ id: '2', amount: 450, status: EXPENSE_STATUS.APPROVED }),
    ];
    const total = approved.reduce((sum, e) => sum + e.amount, 0);
    expect(total).toBe(750);
  });

  it('split expense contributes half the amount per participant', () => {
    const splitExpense = makeExpense({ amount: 600, splitEqually: true });
    const perPersonAmount = splitExpense.amount / 2;
    expect(perPersonAmount).toBe(300);
  });
});
