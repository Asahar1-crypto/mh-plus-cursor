
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
  // Use utility functions but pass in the current expenses state
  const getPendingExpenses = () => getFilteredPendingExpenses(expenses);
  const getApprovedExpenses = () => getFilteredApprovedExpenses(expenses);
  const getPaidExpenses = () => getFilteredPaidExpenses(expenses);
  const getRejectedExpenses = () => getFilteredRejectedExpenses(expenses);
  const getTotalPending = () => calculateTotalPending(expenses);
  const getTotalApproved = () => calculateTotalApproved(expenses);
  const getExpensesByChild = (childId: string) => filterExpensesByChild(expenses, childId);
  const getExpensesByCategory = (category: string) => filterExpensesByCategory(expenses, category);
  const getExpensesByMonth = (month: number, year: number) => filterExpensesByMonth(expenses, month, year);
  const getMonthlyBalance = () => calculateMonthlyBalance(expenses);

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
