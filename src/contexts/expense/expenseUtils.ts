
import { Expense } from './types';
import { EXPENSE_STATUS } from './constants';
import { isDateInCycle, getCurrentCycle } from '@/utils/billingCycleUtils';

export const getPendingExpenses = (expenses: Expense[]): Expense[] =>
  expenses.filter(e => e.status === EXPENSE_STATUS.PENDING && !e.isRecurring);

export const getApprovedExpenses = (expenses: Expense[]): Expense[] =>
  expenses.filter(e => e.status === EXPENSE_STATUS.APPROVED);

export const getPaidExpenses = (expenses: Expense[]): Expense[] =>
  expenses.filter(e => e.status === EXPENSE_STATUS.PAID);

export const getRejectedExpenses = (expenses: Expense[]): Expense[] =>
  expenses.filter(e => e.status === EXPENSE_STATUS.REJECTED);

export const getTotalPending = (expenses: Expense[]): number => 
  getPendingExpenses(expenses).reduce((acc, curr) => acc + curr.amount, 0);

export const getTotalApproved = (expenses: Expense[]): number => 
  getApprovedExpenses(expenses).reduce((acc, curr) => acc + curr.amount, 0);

export const getExpensesByChild = (expenses: Expense[], childId: string): Expense[] => 
  expenses.filter(e => e.childId === childId);

export const getExpensesByCategory = (expenses: Expense[], category: string): Expense[] => 
  expenses.filter(e => e.category === category);

export const getExpensesByMonth = (expenses: Expense[], month: number, year: number, billingDay = 1): Expense[] => {
  return expenses.filter(expense => {
    // month is 0-based from callers; isDateInCycle expects 1-based
    return isDateInCycle(expense.date, billingDay, month + 1, year);
  });
};

export const getMonthlyBalance = (expenses: Expense[], billingDay = 1): number => {
  const { month, year } = getCurrentCycle(billingDay);
  // getCurrentCycle returns 1-based month; getExpensesByMonth expects 0-based
  return getExpensesByMonth(
    getApprovedExpenses(expenses).filter(e => e.includeInMonthlyBalance),
    month - 1,
    year,
    billingDay
  ).reduce((acc, curr) => acc + curr.amount, 0);
};

export const getRecurringExpenses = (expenses: Expense[]): Expense[] => 
  expenses.filter(e => e.isRecurring);

export const getNonRecurringExpenses = (expenses: Expense[]): Expense[] => 
  expenses.filter(e => !e.isRecurring);

export const getActiveRecurringExpenses = (expenses: Expense[]): Expense[] => {
  const today = new Date();
  return getRecurringExpenses(expenses).filter(expense => {
    if (!expense.hasEndDate || !expense.endDate) return true;
    return new Date(expense.endDate) >= today;
  });
};
