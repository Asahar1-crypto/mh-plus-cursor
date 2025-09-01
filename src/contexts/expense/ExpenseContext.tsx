
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
  const { user, account } = useAuth();
  
  // Don't render children until auth is ready to prevent context issues
  if (!user) {
    return <>{children}</>;
  }
  
  // Use our custom hooks to manage state and logic - pass both user and account
  const { 
    expenses, 
    setExpenses, 
    childrenList, 
    setChildrenList,
    isLoading,
    refreshData
  } = useExpenseStorage(user, account);
  
  const { 
    addExpense,
    approveExpense,
    rejectExpense,
    markAsPaid,
    updateExpenseStatus,
    addChild,
    updateChild,
    uploadReceipt,
    isSubmitting
  } = useExpenseActions(user, account, expenses, setExpenses, childrenList, setChildrenList, refreshData);
  
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
    isLoading,
    isSubmitting,
    addExpense,
    approveExpense,
    rejectExpense,
    markAsPaid,
    updateExpenseStatus,
    addChild,
    updateChild,
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
    uploadReceipt,
    refreshData
  };

  return (
    <ExpenseContext.Provider value={contextValue}>
      {children}
    </ExpenseContext.Provider>
  );
};
