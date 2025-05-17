
import React, { createContext, ReactNode } from 'react';
import { useAuth } from '../AuthContext';
import { Expense, Child, ExpenseContextType } from './types';
import { useExpenseStorage } from './useExpenseStorage';
import { useExpenseActions } from './useExpenseActions';
import { useExpenseQueries } from './useExpenseQueries';

export const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

interface ExpenseProviderProps {
  children: ReactNode;
}

export const ExpenseProvider = ({ children }: ExpenseProviderProps) => {
  const { user } = useAuth();
  
  // Use our custom hooks to manage state and logic
  const { 
    expenses, 
    setExpenses, 
    childrenList, 
    setChildrenList 
  } = useExpenseStorage(user);
  
  const { 
    addExpense,
    approveExpense,
    rejectExpense,
    markAsPaid,
    addChild,
    uploadReceipt
  } = useExpenseActions(user, expenses, setExpenses, childrenList, setChildrenList);
  
  const { 
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
  } = useExpenseQueries(expenses);

  // Combine all the pieces into our context value
  const contextValue: ExpenseContextType = {
    expenses,
    childrenList,
    addExpense,
    approveExpense,
    rejectExpense,
    markAsPaid,
    addChild,
    getPendingExpenses,
    getApprovedExpenses,
    getPaidExpenses,
    getRejectedExpenses,
    getTotalPending,
    getTotalApproved,
    getExpensesByChild,
    getExpensesByCategory,
    getExpensesByMonth,
    getMonthlyBalance,
    uploadReceipt
  };

  return (
    <ExpenseContext.Provider value={contextValue}>
      {children}
    </ExpenseContext.Provider>
  );
};
