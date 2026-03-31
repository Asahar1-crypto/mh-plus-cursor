
import React, { createContext, ReactNode, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { Expense, Child, ExpenseContextType } from './types';
import { useExpenseStorage } from './useExpenseStorage';
import { useExpenseActions } from './useExpenseActions';
import { useExpenseQueries } from './useExpenseQueries';

export const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

interface ExpenseProviderProps {
  children: ReactNode;
}

// Inner component so all hooks are called unconditionally
const ExpenseProviderInner = ({ children }: ExpenseProviderProps) => {
  const { user, account, isLoading: authLoading } = useAuth();
  const authReady = !authLoading;

  const {
    expenses,
    setExpenses,
    childrenList,
    setChildrenList,
    categoriesList,
    setCategoriesList,
    isLoading,
    error,
    refreshData
  } = useExpenseStorage(user, account, authReady);

  const {
    addExpense,
    updateExpense,
    approveExpense,
    approveAllRecurring,
    rejectExpense,
    markAsPaid,
    updateExpenseStatus,
    deleteExpense,
    updateRecurringActive,
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
  } = useExpenseQueries(expenses, account?.billing_cycle_start_day ?? 1);

  // Memoize the context value to prevent unnecessary re-renders of consumers
  const contextValue = useMemo<ExpenseContextType>(() => ({
    expenses,
    childrenList,
    categoriesList,
    isLoading,
    error,
    isSubmitting,
    addExpense,
    updateExpense,
    approveExpense,
    approveAllRecurring,
    rejectExpense,
    markAsPaid,
    updateExpenseStatus,
    deleteExpense,
    updateRecurringActive,
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
  }), [
    expenses, childrenList, categoriesList,
    isLoading, error, isSubmitting,
    addExpense, updateExpense,
    approveExpense, approveAllRecurring, rejectExpense, markAsPaid,
    updateExpenseStatus, deleteExpense, updateRecurringActive,
    addChild, updateChild,
    getPendingExpenses, getApprovedExpenses, getPaidExpenses, getRejectedExpenses,
    getTotalPending, getTotalApproved,
    getExpensesByChild, getExpensesByCategory, getExpensesByMonth, getMonthlyBalance,
    uploadReceipt, refreshData
  ]);

  return (
    <ExpenseContext.Provider value={contextValue}>
      {children}
    </ExpenseContext.Provider>
  );
};

export const ExpenseProvider = ({ children }: ExpenseProviderProps) => {
  const { user } = useAuth();

  // Don't render children until auth is ready to prevent context issues
  if (!user) {
    return <>{children}</>;
  }

  return <ExpenseProviderInner>{children}</ExpenseProviderInner>;
};
