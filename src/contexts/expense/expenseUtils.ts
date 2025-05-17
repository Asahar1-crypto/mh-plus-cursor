
import { Expense } from './types';

export const getPendingExpenses = (expenses: Expense[]): Expense[] => 
  expenses.filter(e => e.status === 'pending');

export const getApprovedExpenses = (expenses: Expense[]): Expense[] => 
  expenses.filter(e => e.status === 'approved');

export const getPaidExpenses = (expenses: Expense[]): Expense[] => 
  expenses.filter(e => e.status === 'paid');

export const getTotalPending = (expenses: Expense[]): number => 
  getPendingExpenses(expenses).reduce((acc, curr) => acc + curr.amount, 0);

export const getTotalApproved = (expenses: Expense[]): number => 
  getApprovedExpenses(expenses).reduce((acc, curr) => acc + curr.amount, 0);

export const getExpensesByChild = (expenses: Expense[], childId: string): Expense[] => 
  expenses.filter(e => e.childId === childId);
