
import { useContext } from 'react';
import { ExpenseContext } from './ExpenseContext';
import type { ExpenseContextType } from './types';

export const useExpense = (): ExpenseContextType => {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error('useExpense must be used within an ExpenseProvider');
  }
  return context;
};
