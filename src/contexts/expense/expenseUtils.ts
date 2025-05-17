
import { Expense } from './types';

export const getPendingExpenses = (expenses: Expense[]): Expense[] => 
  expenses.filter(e => e.status === 'pending');

export const getApprovedExpenses = (expenses: Expense[]): Expense[] => 
  expenses.filter(e => e.status === 'approved');

export const getPaidExpenses = (expenses: Expense[]): Expense[] => 
  expenses.filter(e => e.status === 'paid');

export const getRejectedExpenses = (expenses: Expense[]): Expense[] => 
  expenses.filter(e => e.status === 'rejected');

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
