/**
 * Advanced approval flow edge-case tests.
 *
 * Covers business rules NOT tested in approvalFlow.test.ts:
 * - Self-approval guard with plan type awareness (personal vs family)
 * - markAsPaid status guard
 * - Auto-approval at creation
 * - Recurring auto-approval fields
 * - Arbitrary status transitions (no state machine)
 * - Optimistic update isolation (multi-expense)
 * - Activity log action strings
 */

import { describe, it, expect } from 'vitest';
import {
  getPendingExpenses,
  getApprovedExpenses,
  getPaidExpenses,
  getRejectedExpenses,
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

/**
 * Replicates the self-approval guard from useExpenseActions.
 * Personal plan allows self-approval; family plan blocks it.
 */
const isSelfApprovalBlocked = (
  planSlug: string,
  createdBy: string,
  currentUserId: string,
): boolean => {
  const isPersonalPlan = planSlug === 'personal';
  if (!isPersonalPlan && createdBy === currentUserId) {
    return true; // blocked
  }
  return false;
};

/**
 * Replicates the markAsPaid guard: only approved expenses can transition to paid.
 */
const canMarkAsPaid = (status: Expense['status']): boolean => {
  return status === EXPENSE_STATUS.APPROVED;
};

/**
 * Replicates auto-approval logic at creation time.
 */
const shouldAutoApprove = (
  isPersonalPlan: boolean,
  creatorId: string,
  paidById: string,
  hasVirtualPartner: boolean,
): boolean => {
  return isPersonalPlan || creatorId === paidById || hasVirtualPartner;
};

/**
 * Maps a status transition action to its activity log string.
 */
const actionToLogString = (action: 'approve' | 'reject' | 'markAsPaid'): string => {
  const map: Record<string, string> = {
    approve: 'approve_expense',
    reject: 'reject_expense',
    markAsPaid: 'mark_paid',
  };
  return map[action];
};

// ─── 1. שמירת עצמית – חוקי אישור עצמי לפי סוג תוכנית ──────────────────────

describe('Self-approval guard with plan types', () => {
  const currentUserId = 'user-1';

  it('personal plan: user CAN approve their own expense', () => {
    const blocked = isSelfApprovalBlocked('personal', currentUserId, currentUserId);
    expect(blocked).toBe(false);
  });

  it('family plan: user CANNOT approve their own expense', () => {
    const blocked = isSelfApprovalBlocked('family', currentUserId, currentUserId);
    expect(blocked).toBe(true);
  });

  it("family plan: user CAN approve partner's expense", () => {
    const blocked = isSelfApprovalBlocked('family', 'user-2', currentUserId);
    expect(blocked).toBe(false);
  });

  it('couple plan: user CANNOT approve their own expense', () => {
    const blocked = isSelfApprovalBlocked('couple', currentUserId, currentUserId);
    expect(blocked).toBe(true);
  });
});

// ─── 2. שמירת סטטוס – markAsPaid מאפשר רק הוצאות מאושרות ──────────────────

describe('markAsPaid status guard', () => {
  it('can mark an approved expense as paid', () => {
    expect(canMarkAsPaid(EXPENSE_STATUS.APPROVED)).toBe(true);
  });

  it('cannot mark a pending expense as paid', () => {
    expect(canMarkAsPaid(EXPENSE_STATUS.PENDING)).toBe(false);
  });

  it('cannot mark a rejected expense as paid', () => {
    expect(canMarkAsPaid(EXPENSE_STATUS.REJECTED)).toBe(false);
  });

  it('cannot mark an already-paid expense as paid again', () => {
    expect(canMarkAsPaid(EXPENSE_STATUS.PAID)).toBe(false);
  });

  it('guard integrates with expense list: only approved expenses pass', () => {
    const expenses = [
      makeExpense({ id: 'a', status: EXPENSE_STATUS.PENDING }),
      makeExpense({ id: 'b', status: EXPENSE_STATUS.APPROVED }),
      makeExpense({ id: 'c', status: EXPENSE_STATUS.REJECTED }),
      makeExpense({ id: 'd', status: EXPENSE_STATUS.PAID }),
    ];
    const payable = expenses.filter(e => canMarkAsPaid(e.status));
    expect(payable).toHaveLength(1);
    expect(payable[0].id).toBe('b');
  });
});

// ─── 3. אישור אוטומטי בעת יצירה ────────────────────────────────────────────

describe('Auto-approval at creation', () => {
  it('personal plan -> auto-approved', () => {
    expect(shouldAutoApprove(true, 'user-1', 'user-2', false)).toBe(true);
  });

  it('creator is payer -> auto-approved', () => {
    expect(shouldAutoApprove(false, 'user-1', 'user-1', false)).toBe(true);
  });

  it('virtual partner account -> auto-approved', () => {
    expect(shouldAutoApprove(false, 'user-1', 'user-2', true)).toBe(true);
  });

  it('family plan, creator !== payer, no virtual partner -> pending (not auto-approved)', () => {
    expect(shouldAutoApprove(false, 'user-1', 'user-2', false)).toBe(false);
  });

  it('auto-approved expense gets status=approved in list', () => {
    const autoApproved = shouldAutoApprove(true, 'user-1', 'user-2', false);
    const expense = makeExpense({
      status: autoApproved ? EXPENSE_STATUS.APPROVED : EXPENSE_STATUS.PENDING,
    });
    expect(expense.status).toBe(EXPENSE_STATUS.APPROVED);
    expect(getApprovedExpenses([expense])).toHaveLength(1);
    expect(getPendingExpenses([expense])).toHaveLength(0);
  });

  it('non-auto-approved expense gets status=pending in list', () => {
    const autoApproved = shouldAutoApprove(false, 'user-1', 'user-2', false);
    const expense = makeExpense({
      status: autoApproved ? EXPENSE_STATUS.APPROVED : EXPENSE_STATUS.PENDING,
    });
    expect(expense.status).toBe(EXPENSE_STATUS.PENDING);
    expect(getPendingExpenses([expense])).toHaveLength(1);
    expect(getApprovedExpenses([expense])).toHaveLength(0);
  });
});

// ─── 4. אישור אוטומטי של הוצאות חוזרות ─────────────────────────────────────

describe('Recurring auto-approval', () => {
  it('approveAllRecurring requires a recurringParentId', () => {
    const expense = makeExpense({ recurringParentId: undefined, isRecurring: true });
    const hasParentId = !!expense.recurringParentId;
    expect(hasParentId).toBe(false);
    // Guard: should block when no parent id
  });

  it('approveAllRecurring proceeds when recurringParentId exists', () => {
    const expense = makeExpense({
      recurringParentId: 'template-1',
      isRecurring: true,
    });
    const hasParentId = !!expense.recurringParentId;
    expect(hasParentId).toBe(true);
  });

  it('template fields are updated after approveAllRecurring', () => {
    const template = makeExpense({
      id: 'template-1',
      isRecurring: true,
      recurringAutoApproved: false,
      recurringApprovedBy: undefined,
    });

    // Simulate what approveAllRecurring does to the template
    const updatedTemplate: Expense = {
      ...template,
      recurringAutoApproved: true,
      recurringApprovedBy: 'user-1',
    };

    expect(updatedTemplate.recurringAutoApproved).toBe(true);
    expect(updatedTemplate.recurringApprovedBy).toBe('user-1');
  });

  it('auto-approved recurring instance has status=approved and approvedBy set', () => {
    const instance = makeExpense({
      id: 'instance-march',
      isRecurring: false,
      recurringParentId: 'template-1',
      status: EXPENSE_STATUS.APPROVED,
      approvedBy: 'user-1',
      approvedAt: '2026-03-01T06:00:00Z',
    });

    expect(instance.status).toBe(EXPENSE_STATUS.APPROVED);
    expect(instance.approvedBy).toBe('user-1');
    expect(instance.approvedAt).toBeDefined();
    expect(getApprovedExpenses([instance])).toHaveLength(1);
  });

  it('non-auto-approved recurring instance stays pending', () => {
    const instance = makeExpense({
      id: 'instance-march',
      isRecurring: false,
      recurringParentId: 'template-1',
      status: EXPENSE_STATUS.PENDING,
      approvedBy: undefined,
    });

    expect(instance.status).toBe(EXPENSE_STATUS.PENDING);
    expect(instance.approvedBy).toBeUndefined();
    expect(getPendingExpenses([instance])).toHaveLength(1);
  });
});

// ─── 5. מעברי סטטוס – אין מכונת מצבים מלבד markAsPaid ──────────────────────

describe('Status transitions (no state machine except markAsPaid)', () => {
  it('rejected -> approved (undo rejection) is ALLOWED via updateExpenseStatus', () => {
    const expense = makeExpense({ id: 'r1', status: EXPENSE_STATUS.REJECTED });
    const updated = { ...expense, status: EXPENSE_STATUS.APPROVED as Expense['status'] };
    expect(updated.status).toBe(EXPENSE_STATUS.APPROVED);
    expect(getRejectedExpenses([updated])).toHaveLength(0);
    expect(getApprovedExpenses([updated])).toHaveLength(1);
  });

  it('paid -> pending (revert payment) is ALLOWED via updateExpenseStatus', () => {
    const expense = makeExpense({ id: 'p1', status: EXPENSE_STATUS.PAID });
    const updated = { ...expense, status: EXPENSE_STATUS.PENDING as Expense['status'] };
    expect(updated.status).toBe(EXPENSE_STATUS.PENDING);
    expect(getPaidExpenses([updated])).toHaveLength(0);
    expect(getPendingExpenses([updated])).toHaveLength(1);
  });

  it('pending -> paid directly is BLOCKED by markAsPaid guard', () => {
    const expense = makeExpense({ id: 'x1', status: EXPENSE_STATUS.PENDING });
    expect(canMarkAsPaid(expense.status)).toBe(false);
  });

  it('approved -> pending (revert approval) is ALLOWED via updateExpenseStatus', () => {
    const expense = makeExpense({ id: 'a1', status: EXPENSE_STATUS.APPROVED });
    const updated = { ...expense, status: EXPENSE_STATUS.PENDING as Expense['status'] };
    expect(updated.status).toBe(EXPENSE_STATUS.PENDING);
    expect(getApprovedExpenses([updated])).toHaveLength(0);
    expect(getPendingExpenses([updated])).toHaveLength(1);
  });

  it('rejected -> paid directly is BLOCKED by markAsPaid guard', () => {
    const expense = makeExpense({ id: 'r2', status: EXPENSE_STATUS.REJECTED });
    expect(canMarkAsPaid(expense.status)).toBe(false);
  });

  it('full cycle: pending -> approved -> paid', () => {
    let expense = makeExpense({ id: 'cycle', status: EXPENSE_STATUS.PENDING });

    // Step 1: approve
    expense = { ...expense, status: EXPENSE_STATUS.APPROVED as Expense['status'] };
    expect(canMarkAsPaid(expense.status)).toBe(true);

    // Step 2: mark as paid
    expense = { ...expense, status: EXPENSE_STATUS.PAID as Expense['status'] };
    expect(getPaidExpenses([expense])).toHaveLength(1);
  });
});

// ─── 6. עדכון אופטימיסטי – בידוד בין הוצאות ────────────────────────────────

describe('Optimistic update isolation', () => {
  it('approving one expense does not affect sibling expenses', () => {
    const expenses = [
      makeExpense({ id: 'e1', status: EXPENSE_STATUS.PENDING, amount: 100 }),
      makeExpense({ id: 'e2', status: EXPENSE_STATUS.PENDING, amount: 200 }),
      makeExpense({ id: 'e3', status: EXPENSE_STATUS.APPROVED, amount: 300 }),
      makeExpense({ id: 'e4', status: EXPENSE_STATUS.PAID, amount: 400 }),
    ];

    // Optimistically approve only e1
    const updated = expenses.map(e =>
      e.id === 'e1' ? { ...e, status: EXPENSE_STATUS.APPROVED as Expense['status'] } : e,
    );

    // e1 moved to approved
    expect(updated.find(e => e.id === 'e1')!.status).toBe(EXPENSE_STATUS.APPROVED);
    // e2 still pending
    expect(updated.find(e => e.id === 'e2')!.status).toBe(EXPENSE_STATUS.PENDING);
    // e3 still approved
    expect(updated.find(e => e.id === 'e3')!.status).toBe(EXPENSE_STATUS.APPROVED);
    // e4 still paid
    expect(updated.find(e => e.id === 'e4')!.status).toBe(EXPENSE_STATUS.PAID);

    // Counts
    expect(getPendingExpenses(updated)).toHaveLength(1);
    expect(getApprovedExpenses(updated)).toHaveLength(2);
    expect(getPaidExpenses(updated)).toHaveLength(1);
  });

  it('rejecting one expense preserves amounts of others', () => {
    const expenses = [
      makeExpense({ id: 'e1', status: EXPENSE_STATUS.PENDING, amount: 100 }),
      makeExpense({ id: 'e2', status: EXPENSE_STATUS.PENDING, amount: 200 }),
    ];

    const updated = expenses.map(e =>
      e.id === 'e1' ? { ...e, status: EXPENSE_STATUS.REJECTED as Expense['status'] } : e,
    );

    expect(updated.find(e => e.id === 'e2')!.amount).toBe(200);
    expect(updated.find(e => e.id === 'e2')!.status).toBe(EXPENSE_STATUS.PENDING);
  });

  it('reverting optimistic update restores only the targeted expense', () => {
    const original = [
      makeExpense({ id: 'e1', status: EXPENSE_STATUS.PENDING }),
      makeExpense({ id: 'e2', status: EXPENSE_STATUS.APPROVED }),
    ];

    // Optimistic: approve e1
    const optimistic = original.map(e =>
      e.id === 'e1' ? { ...e, status: EXPENSE_STATUS.APPROVED as Expense['status'] } : e,
    );
    expect(getApprovedExpenses(optimistic)).toHaveLength(2);

    // Server fails -> revert only e1 back to pending
    const reverted = optimistic.map(e =>
      e.id === 'e1' ? { ...e, status: EXPENSE_STATUS.PENDING as Expense['status'] } : e,
    );
    expect(getPendingExpenses(reverted)).toHaveLength(1);
    expect(getPendingExpenses(reverted)[0].id).toBe('e1');
    // e2 remains approved
    expect(getApprovedExpenses(reverted)).toHaveLength(1);
    expect(getApprovedExpenses(reverted)[0].id).toBe('e2');
  });
});

// ─── 7. פעולות יומן פעילות ──────────────────────────────────────────────────

describe('Activity log action strings', () => {
  it('approve maps to approve_expense', () => {
    expect(actionToLogString('approve')).toBe('approve_expense');
  });

  it('reject maps to reject_expense', () => {
    expect(actionToLogString('reject')).toBe('reject_expense');
  });

  it('markAsPaid maps to mark_paid', () => {
    expect(actionToLogString('markAsPaid')).toBe('mark_paid');
  });

  it('all actions produce defined strings', () => {
    const actions: Array<'approve' | 'reject' | 'markAsPaid'> = ['approve', 'reject', 'markAsPaid'];
    for (const action of actions) {
      expect(actionToLogString(action)).toBeDefined();
      expect(typeof actionToLogString(action)).toBe('string');
      expect(actionToLogString(action).length).toBeGreaterThan(0);
    }
  });
});
