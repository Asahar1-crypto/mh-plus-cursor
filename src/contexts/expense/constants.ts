
/**
 * Expense status constants – use these instead of raw string literals
 * to avoid typos and enable IDE autocomplete.
 */
export const EXPENSE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PAID: 'paid',
} as const;

export type ExpenseStatus = typeof EXPENSE_STATUS[keyof typeof EXPENSE_STATUS];

/**
 * Recurring expense frequency constants.
 */
export const EXPENSE_FREQUENCY = {
  MONTHLY: 'monthly',
  WEEKLY: 'weekly',
  YEARLY: 'yearly',
} as const;

export type ExpenseFrequency = typeof EXPENSE_FREQUENCY[keyof typeof EXPENSE_FREQUENCY];
