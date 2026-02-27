
import { Expense } from './types';
import { EXPENSE_STATUS } from './constants';

export const getPendingExpenses = (expenses: Expense[]): Expense[] =>
  expenses.filter(e => e.status === EXPENSE_STATUS.PENDING);

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

export const getExpensesByMonth = (expenses: Expense[], month: number, year: number): Expense[] => {
  return expenses.filter(expense => {
    const expenseDate = new Date(expense.date);
    return expenseDate.getMonth() === month && expenseDate.getFullYear() === year;
  });
};

export const getMonthlyBalance = (expenses: Expense[]): number => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  return getExpensesByMonth(
    getApprovedExpenses(expenses).filter(e => e.includeInMonthlyBalance),
    currentMonth,
    currentYear
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
