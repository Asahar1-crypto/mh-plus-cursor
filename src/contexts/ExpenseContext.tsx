
// This file serves as the entry point for expense context exports
import { ExpenseProvider } from './expense/ExpenseContext';
import { useExpense } from './expense/useExpense';
import { Expense, Child, ExpenseContextType } from './expense/types';

// Export all components and types
export { ExpenseProvider, useExpense, Expense, Child, ExpenseContextType };
