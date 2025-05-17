
import { useState } from 'react';
import { toast } from 'sonner';
import { Expense, Child } from './types';
import { User } from '@/contexts/AuthContext';
import { expenseService } from '@/integrations/supabase/expenseService';

export interface ExpenseActions {
  addExpense: (expense: Omit<Expense, 'id' | 'createdBy' | 'creatorName' | 'status' | 'approvedBy' | 'approvedAt'>) => Promise<void>;
  approveExpense: (id: string) => Promise<void>;
  rejectExpense: (id: string) => Promise<void>;
  markAsPaid: (id: string) => Promise<void>;
  addChild: (child: Omit<Child, 'id'>) => Promise<void>;
  uploadReceipt: (expenseId: string, receiptUrl: string) => Promise<void>;
  isSubmitting: boolean;
}

export const useExpenseActions = (
  user: User | null, 
  expenses: Expense[], 
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>,
  childrenList: Child[],
  setChildrenList: React.Dispatch<React.SetStateAction<Child[]>>
): ExpenseActions => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const addExpense = async (newExpense: Omit<Expense, 'id' | 'createdBy' | 'creatorName' | 'status' | 'approvedBy' | 'approvedAt'>) => {
    if (!user) {
      toast.error('יש להתחבר כדי להוסיף הוצאה');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await expenseService.addExpense(newExpense, user);
      
      // Create a client-side representation of the expense with the data we need
      const expense: Expense = {
        id: result.id,
        amount: newExpense.amount,
        description: newExpense.description,
        date: newExpense.date,
        category: newExpense.category,
        childId: newExpense.childId,
        childName: newExpense.childName,
        createdBy: user.id,
        creatorName: user.name,
        status: 'pending',
        receipt: newExpense.receipt,
        isRecurring: newExpense.isRecurring || false,
        frequency: newExpense.frequency,
        includeInMonthlyBalance: newExpense.includeInMonthlyBalance || true
      };
      
      setExpenses(prevExpenses => [...prevExpenses, expense]);
    } catch (error) {
      console.error('Failed to add expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addChild = async (newChild: Omit<Child, 'id'>) => {
    if (!user) {
      toast.error('יש להתחבר כדי להוסיף ילד/ה');
      return;
    }

    setIsSubmitting(true);
    try {
      const child = await expenseService.addChild(newChild, user);
      setChildrenList(prevChildren => [...prevChildren, child]);
    } catch (error) {
      console.error('Failed to add child:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadReceipt = async (expenseId: string, receiptUrl: string): Promise<void> => {
    if (!user) {
      toast.error('יש להתחבר כדי להעלות קבלה');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await expenseService.uploadReceipt(expenseId, receiptUrl, user);
      
      // Update local state
      setExpenses(prevExpenses => prevExpenses.map(expense => 
        expense.id === expenseId ? { ...expense, receipt: receiptUrl } : expense
      ));
    } catch (error) {
      console.error('Failed to upload receipt:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateExpenseStatus = async (id: string, status: 'pending' | 'approved' | 'rejected' | 'paid'): Promise<void> => {
    if (!user) {
      toast.error('יש להתחבר כדי לעדכן סטטוס הוצאה');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await expenseService.updateExpenseStatus(id, status, user);
      
      // Update local state
      setExpenses(prevExpenses => prevExpenses.map(expense => {
        if (expense.id === id) {
          let updatedExpense = { ...expense, status };
          
          if (status === 'approved') {
            updatedExpense.approvedBy = user.id;
            updatedExpense.approvedAt = new Date().toISOString();
          }
          
          return updatedExpense;
        }
        return expense;
      }));
    } catch (error) {
      console.error(`Failed to ${status} expense:`, error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const approveExpense = async (id: string): Promise<void> => {
    // Find the expense to approve
    const expenseToApprove = expenses.find(expense => expense.id === id);
      
    if (!expenseToApprove) {
      toast.error('ההוצאה לא נמצאה');
      return;
    }
    
    // Check if user IS the one who created the expense - if so, they CAN'T approve it
    if (user && expenseToApprove.createdBy === user.id) {
      toast.error('לא ניתן לאשר הוצאה שהוספת בעצמך');
      return;
    }
    
    await updateExpenseStatus(id, 'approved');
  };

  const rejectExpense = async (id: string): Promise<void> => {
    // Find the expense to reject
    const expenseToReject = expenses.find(expense => expense.id === id);
      
    if (!expenseToReject) {
      toast.error('ההוצאה לא נמצאה');
      return;
    }
    
    // Check if user IS the one who created the expense - if so, they CAN'T reject it
    if (user && expenseToReject.createdBy === user.id) {
      toast.error('לא ניתן לדחות הוצאה שהוספת בעצמך');
      return;
    }
    
    await updateExpenseStatus(id, 'rejected');
  };

  const markAsPaid = async (id: string): Promise<void> => {
    // Find the expense to mark as paid
    const expenseToPay = expenses.find(expense => expense.id === id);
      
    if (!expenseToPay) {
      toast.error('ההוצאה לא נמצאה');
      return;
    }
    
    // Check if expense is approved
    if (expenseToPay.status !== 'approved') {
      toast.error('רק הוצאות מאושרות יכולות להיות מסומנות כשולמו');
      return;
    }
    
    await updateExpenseStatus(id, 'paid');
  };

  return {
    addExpense,
    approveExpense,
    rejectExpense,
    markAsPaid,
    addChild,
    uploadReceipt,
    isSubmitting
  };
};
