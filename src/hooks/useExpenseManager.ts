
import { useExpense } from '@/contexts/ExpenseContext';

export interface UseExpenseManagerResult {
  pendingExpenses: any[];
  approvedExpenses: any[];
  paidExpenses: any[];
  pendingTotal: number;
  approvedTotal: number;
  paidTotal: number;
  approveExpense: (id: string) => Promise<void>;
  rejectExpense: (id: string) => Promise<void>;
  markAsPaid: (id: string) => Promise<void>;
}

export const useExpenseManager = (): UseExpenseManagerResult => {
  // Define a default fallback for expense data
  const defaultExpenseData = {
    expenses: [],
    getPendingExpenses: () => [],
    getApprovedExpenses: () => [],
    getPaidExpenses: () => [],
    getTotalPending: () => 0,
    getTotalApproved: () => 0,
    approveExpense: async (id: string) => {},
    rejectExpense: async (id: string) => {},
    markAsPaid: async (id: string) => {}
  };

  let expenseData = defaultExpenseData;
  
  try {
    // Try to use the expense context
    expenseData = useExpense();
  } catch (error) {
    console.error("Failed to use expense context:", error);
  }
  
  const { 
    getPendingExpenses, 
    getApprovedExpenses, 
    getPaidExpenses, 
    getTotalPending,
    getTotalApproved,
    approveExpense,
    rejectExpense,
    markAsPaid
  } = expenseData;
  
  const pendingExpenses = getPendingExpenses();
  const approvedExpenses = getApprovedExpenses();
  const paidExpenses = getPaidExpenses();
  
  const pendingTotal = getTotalPending();
  const approvedTotal = getTotalApproved();
  const paidTotal = paidExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  return {
    pendingExpenses,
    approvedExpenses,
    paidExpenses,
    pendingTotal,
    approvedTotal,
    paidTotal,
    approveExpense,
    rejectExpense,
    markAsPaid
  };
};
