
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../AuthContext';
import { Expense, Child, ExpenseContextType } from './types';
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

export const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

interface ExpenseProviderProps {
  children: ReactNode;
}

export const ExpenseProvider = ({ children }: ExpenseProviderProps) => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [childrenList, setChildrenList] = useState<Child[]>([]);

  // Load children when user changes
  useEffect(() => {
    if (user) {
      // In a real application, we would fetch from backend
      // For now, we'll retrieve from localStorage
      const savedChildren = localStorage.getItem(`children-${user.id}`);
      if (savedChildren) {
        try {
          setChildrenList(JSON.parse(savedChildren));
        } catch (error) {
          console.error('Failed to parse saved children:', error);
        }
      }
      
      // Load expenses for the user
      const savedExpenses = localStorage.getItem(`expenses-${user.id}`);
      if (savedExpenses) {
        try {
          setExpenses(JSON.parse(savedExpenses));
        } catch (error) {
          console.error('Failed to parse saved expenses:', error);
        }
      }
    }
  }, [user]);

  // Save expenses whenever they change
  useEffect(() => {
    if (user && expenses.length > 0) {
      localStorage.setItem(`expenses-${user.id}`, JSON.stringify(expenses));
    }
  }, [expenses, user]);

  const addExpense = async (newExpense: Omit<Expense, 'id' | 'createdBy' | 'creatorName' | 'status' | 'approvedBy' | 'approvedAt'>) => {
    if (!user) {
      toast.error('יש להתחבר כדי להוסיף הוצאה');
      return;
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const expense: Expense = {
        ...newExpense,
        id: `exp-${Date.now()}`,
        createdBy: user.id,
        creatorName: user.name,
        status: 'pending',
        includeInMonthlyBalance: true // Default to include in balance
      };
      
      setExpenses(prev => [...prev, expense]);
      toast.success('ההוצאה נוספה בהצלחה');
      
      // In a real app, this would trigger a notification to the other user
      // toast.info('התראה נשלחה לשותף לאישור ההוצאה');
    } catch (error) {
      console.error('Failed to add expense:', error);
      toast.error('הוספת ההוצאה נכשלה, אנא נסה שוב.');
    }
  };

  const addChild = async (newChild: Omit<Child, 'id'>) => {
    if (!user) {
      toast.error('יש להתחבר כדי להוסיף ילד/ה');
      return;
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const child: Child = {
        ...newChild,
        id: `child-${Date.now()}`
      };
      
      const updatedChildren = [...childrenList, child];
      setChildrenList(updatedChildren);
      
      // Save to localStorage with user ID as part of the key
      localStorage.setItem(`children-${user.id}`, JSON.stringify(updatedChildren));
      
      toast.success('הילד/ה נוספ/ה בהצלחה');
    } catch (error) {
      console.error('Failed to add child:', error);
      toast.error('הוספת הילד/ה נכשלה, אנא נסה שוב.');
    }
  };

  const uploadReceipt = async (expenseId: string, receiptUrl: string): Promise<void> => {
    if (!user) {
      toast.error('יש להתחבר כדי להעלות קבלה');
      return;
    }
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setExpenses(prev => 
        prev.map(expense => 
          expense.id === expenseId ? { ...expense, receipt: receiptUrl } : expense
        )
      );
      
      toast.success('הקבלה הועלתה בהצלחה');
    } catch (error) {
      console.error('Failed to upload receipt:', error);
      toast.error('העלאת הקבלה נכשלה, אנא נסה שוב.');
    }
  };

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

  return (
    <ExpenseContext.Provider value={{
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
    }}>
      {children}
    </ExpenseContext.Provider>
  );
  
  async function approveExpense(id: string): Promise<void> {
    if (!user) {
      toast.error('יש להתחבר כדי לאשר הוצאה');
      return;
    }
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setExpenses(prev => 
        prev.map(expense => {
          if (expense.id === id) {
            // Check if user is not the one who created the expense
            if (expense.createdBy === user.id) {
              toast.error('לא ניתן לאשר הוצאה שהוספת בעצמך');
              return expense;
            }
            
            return { 
              ...expense, 
              status: 'approved',
              approvedBy: user.id,
              approvedAt: new Date().toISOString()
            };
          }
          return expense;
        })
      );
      
      toast.success('ההוצאה אושרה בהצלחה');
    } catch (error) {
      console.error('Failed to approve expense:', error);
      toast.error('אישור ההוצאה נכשל, אנא נסה שוב.');
    }
    return Promise.resolve();
  }

  async function rejectExpense(id: string): Promise<void> {
    if (!user) {
      toast.error('יש להתחבר כדי לדחות הוצאה');
      return;
    }
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setExpenses(prev => 
        prev.map(expense => {
          if (expense.id === id) {
            // Check if user is not the one who created the expense
            if (expense.createdBy === user.id) {
              toast.error('לא ניתן לדחות הוצאה שהוספת בעצמך');
              return expense;
            }
            
            return { 
              ...expense, 
              status: 'rejected',
              includeInMonthlyBalance: false // Rejected expenses don't affect balance
            };
          }
          return expense;
        })
      );
      
      toast.success('ההוצאה נדחתה');
    } catch (error) {
      console.error('Failed to reject expense:', error);
      toast.error('דחיית ההוצאה נכשלה, אנא נסה שוב.');
    }
    return Promise.resolve();
  }

  async function markAsPaid(id: string): Promise<void> {
    if (!user) {
      toast.error('יש להתחבר כדי לסמן הוצאה כשולמה');
      return;
    }
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setExpenses(prev => 
        prev.map(expense => {
          if (expense.id === id) {
            // Check if expense is approved
            if (expense.status !== 'approved') {
              toast.error('רק הוצאות מאושרות יכולות להיות מסומנות כשולמו');
              return expense;
            }
            
            return { ...expense, status: 'paid' };
          }
          return expense;
        })
      );
      
      toast.success('ההוצאה סומנה כשולמה');
    } catch (error) {
      console.error('Failed to mark expense as paid:', error);
      toast.error('סימון ההוצאה כשולמה נכשל, אנא נסה שוב.');
    }
    return Promise.resolve();
  }
};
