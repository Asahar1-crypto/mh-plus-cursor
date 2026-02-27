
import { useCallback } from 'react';
import { Expense } from './types';
import {
  getPendingExpenses as getFilteredPendingExpenses,
  getApprovedExpenses as getFilteredApprovedExpenses,
  getPaidExpenses as getFilteredPaidExpenses,
  getRejectedExpenses as getFilteredRejectedExpenses,
  getTotalPending as calculateTotalPending,
  getTotalApproved as calculateTotalApproved,
  getExpensesByChild as filterExpensesByChild,
  getExpensesByCategory as filterExpensesByCategory,
  getExpensesByMonth as filterExpensesByMonth,
  getMonthlyBalance as calculateMonthlyBalance
} from './expenseUtils';

export interface ExpenseQueries {
  getPendingExpenses: () => Expense[];
  getApprovedExpenses: () => Expense[];
  getPaidExpenses: () => Expense[];
  getRejectedExpenses: () => Expense[];
  getTotalPending: () => number;
  getTotalApproved: () => number;
  getExpensesByChild: (childId: string) => Expense[];
  getExpensesByCategory: (category: string) => Expense[];
  getExpensesByMonth: (month: number, year: number) => Expense[];
  getMonthlyBalance: () => number;
}

export const useExpenseQueries = (expenses: Expense[]): ExpenseQueries => {
  const getPendingExpenses = useCallback(() => getFilteredPendingExpenses(expenses), [expenses]);
  const getApprovedExpenses = useCallback(() => getFilteredApprovedExpenses(expenses), [expenses]);
  const getPaidExpenses = useCallback(() => getFilteredPaidExpenses(expenses), [expenses]);
  const getRejectedExpenses = useCallback(() => getFilteredRejectedExpenses(expenses), [expenses]);
  const getTotalPending = useCallback(() => calculateTotalPending(expenses), [expenses]);
  const getTotalApproved = useCallback(() => calculateTotalApproved(expenses), [expenses]);
  const getExpensesByChild = useCallback((childId: string) => filterExpensesByChild(expenses, childId), [expenses]);
  const getExpensesByCategory = useCallback((category: string) => filterExpensesByCategory(expenses, category), [expenses]);
  const getExpensesByMonth = useCallback((month: number, year: number) => filterExpensesByMonth(expenses, month, year), [expenses]);
  const getMonthlyBalance = useCallback(() => calculateMonthlyBalance(expenses), [expenses]);

  return {
    getPendingExpenses,
    getApprovedExpenses,
    getPaidExpenses,
    getRejectedExpenses,
    getTotalPending,
    getTotalApproved,
    getExpensesByChild,
    getExpensesByCategory,
    getExpensesByMonth,
    getMonthlyBalance
  };
};
