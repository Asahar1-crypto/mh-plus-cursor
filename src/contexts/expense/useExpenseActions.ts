
import { useState } from 'react';
import { toast } from 'sonner';
import { Expense, Child } from './types';
import { User } from '@/contexts/AuthContext';

export interface ExpenseActions {
  addExpense: (expense: Omit<Expense, 'id' | 'createdBy' | 'creatorName' | 'status' | 'approvedBy' | 'approvedAt'>) => Promise<void>;
  approveExpense: (id: string) => Promise<void>;
  rejectExpense: (id: string) => Promise<void>;
  markAsPaid: (id: string) => Promise<void>;
  addChild: (child: Omit<Child, 'id'>) => Promise<void>;
  uploadReceipt: (expenseId: string, receiptUrl: string) => Promise<void>;
}

export const useExpenseActions = (
  user: User | null, 
  expenses: Expense[], 
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>,
  childrenList: Child[],
  setChildrenList: React.Dispatch<React.SetStateAction<Child[]>>
): ExpenseActions => {
  
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
        status: 'pending' as const,
        includeInMonthlyBalance: true // Default to include in balance
      };
      
      const updatedExpenses = [...expenses, expense];
      setExpenses(updatedExpenses);
      
      // Save to localStorage directly to ensure it's saved immediately
      if (user) {
        localStorage.setItem(`expenses-${user.id}`, JSON.stringify(updatedExpenses));
      }
      
      toast.success('ההוצאה נוספה בהצלחה');
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
      if (user) {
        localStorage.setItem(`children-${user.id}`, JSON.stringify(updatedChildren));
      }
      
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
      
      const updatedExpenses = expenses.map(expense => 
        expense.id === expenseId ? { ...expense, receipt: receiptUrl } : expense
      );
      
      setExpenses(updatedExpenses);
      
      // Save to localStorage immediately
      if (user) {
        localStorage.setItem(`expenses-${user.id}`, JSON.stringify(updatedExpenses));
      }
      
      toast.success('הקבלה הועלתה בהצלחה');
    } catch (error) {
      console.error('Failed to upload receipt:', error);
      toast.error('העלאת הקבלה נכשלה, אנא נסה שוב.');
    }
  };

  const approveExpense = async (id: string): Promise<void> => {
    if (!user) {
      toast.error('יש להתחבר כדי לאשר הוצאה');
      return;
    }
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedExpenses = expenses.map(expense => {
        if (expense.id === id) {
          // Check if user IS the one who created the expense - if so, they CAN'T approve it
          if (expense.createdBy === user.id) {
            toast.error('לא ניתן לאשר הוצאה שהוספת בעצמך');
            return expense;
          }
          
          return { 
            ...expense, 
            status: 'approved' as const,
            approvedBy: user.id,
            approvedAt: new Date().toISOString()
          };
        }
        return expense;
      });
      
      setExpenses(updatedExpenses);
      
      // Save to localStorage directly to ensure it's saved immediately
      if (user) {
        localStorage.setItem(`expenses-${user.id}`, JSON.stringify(updatedExpenses));
      }
      
      toast.success('ההוצאה אושרה בהצלחה');
    } catch (error) {
      console.error('Failed to approve expense:', error);
      toast.error('אישור ההוצאה נכשל, אנא נסה שוב.');
    }
  };

  const rejectExpense = async (id: string): Promise<void> => {
    if (!user) {
      toast.error('יש להתחבר כדי לדחות הוצאה');
      return;
    }
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedExpenses = expenses.map(expense => {
        if (expense.id === id) {
          // Check if user IS the one who created the expense - if so, they CAN'T reject it
          if (expense.createdBy === user.id) {
            toast.error('לא ניתן לדחות הוצאה שהוספת בעצמך');
            return expense;
          }
          
          return { 
            ...expense, 
            status: 'rejected' as const,
            includeInMonthlyBalance: false // Rejected expenses don't affect balance
          };
        }
        return expense;
      });
      
      setExpenses(updatedExpenses);
      
      // Save to localStorage directly to ensure it's saved immediately
      if (user) {
        localStorage.setItem(`expenses-${user.id}`, JSON.stringify(updatedExpenses));
      }
      
      toast.success('ההוצאה נדחתה');
    } catch (error) {
      console.error('Failed to reject expense:', error);
      toast.error('דחיית ההוצאה נכשלה, אנא נסה שוב.');
    }
  };

  const markAsPaid = async (id: string): Promise<void> => {
    if (!user) {
      toast.error('יש להתחבר כדי לסמן הוצאה כשולמה');
      return;
    }
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedExpenses = expenses.map(expense => {
        if (expense.id === id) {
          // Check if expense is approved
          if (expense.status !== 'approved') {
            toast.error('רק הוצאות מאושרות יכולות להיות מסומנות כשולמו');
            return expense;
          }
          
          return { ...expense, status: 'paid' as const };
        }
        return expense;
      });
      
      setExpenses(updatedExpenses);
      
      // Save to localStorage directly to ensure it's saved immediately
      if (user) {
        localStorage.setItem(`expenses-${user.id}`, JSON.stringify(updatedExpenses));
      }
      
      toast.success('ההוצאה סומנה כשולמה');
    } catch (error) {
      console.error('Failed to mark expense as paid:', error);
      toast.error('סימון ההוצאה כשולמה נכשל, אנא נסה שוב.');
    }
  };

  return {
    addExpense,
    approveExpense,
    rejectExpense,
    markAsPaid,
    addChild,
    uploadReceipt
  };
};
