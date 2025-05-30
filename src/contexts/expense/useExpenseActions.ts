import { useState } from 'react';
import { toast } from 'sonner';
import { Expense, Child } from './types';
import { User } from '@/contexts/AuthContext';
import { Account } from '@/contexts/auth/types';
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
  account: Account | null,
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

    if (!account) {
      toast.error('לא נמצא חשבון פעיל');
      return;
    }

    setIsSubmitting(true);
    try {
      // Pass both user and account to the service
      await expenseService.addExpense(user, account, newExpense);
      
      // Create a client-side representation of the expense with the data we need
      const expense: Expense = {
        id: `temp-${Date.now()}`, // Temporary ID until we get the real one
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
      toast.success('ההוצאה נוספה בהצלחה');
    } catch (error) {
      console.error('Failed to add expense:', error);
      toast.error('שגיאה בהוספת ההוצאה');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addChild = async (newChild: Omit<Child, 'id'>) => {
    if (!user) {
      toast.error('יש להתחבר כדי להוסיף ילד/ה');
      return;
    }

    if (!account) {
      toast.error('לא נמצא חשבון פעיל');
      return;
    }

    setIsSubmitting(true);
    try {
      // Pass both user and account to the service
      await expenseService.addChild(user, account, newChild);
      
      // Create a client-side representation with temp ID
      const child: Child = {
        id: `temp-${Date.now()}`,
        name: newChild.name,
        birthDate: newChild.birthDate
      };
      
      setChildrenList(prevChildren => [...prevChildren, child]);
      toast.success('הילד/ה נוספ/ה בהצלחה');
    } catch (error: any) {
      console.error('Failed to add child:', error);
      toast.error(`שגיאה בהוספת ילד/ה: ${error.message || 'אנא נסה שוב'}`);
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
      // For now, just update local state since uploadReceipt method doesn't exist yet
      setExpenses(prevExpenses => prevExpenses.map(expense => 
        expense.id === expenseId ? { ...expense, receipt: receiptUrl } : expense
      ));
      toast.success('הקבלה הועלתה בהצלחה');
    } catch (error) {
      console.error('Failed to upload receipt:', error);
      toast.error('שגיאה בהעלאת הקבלה');
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
      // For now, just update local state since updateExpenseStatus method doesn't exist yet
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
      
      let statusText = '';
      switch (status) {
        case 'approved': statusText = 'אושרה'; break;
        case 'rejected': statusText = 'נדחתה'; break;
        case 'paid': statusText = 'סומנה כשולמה'; break;
      }
      toast.success(`ההוצאה ${statusText} בהצלחה`);
    } catch (error) {
      console.error(`Failed to ${status} expense:`, error);
      toast.error(`שגיאה ב${status === 'approved' ? 'אישור' : status === 'rejected' ? 'דחיית' : 'סימון'} ההוצאה`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const approveExpense = async (id: string): Promise<void> => {
    const expenseToApprove = expenses.find(expense => expense.id === id);
      
    if (!expenseToApprove) {
      toast.error('ההוצאה לא נמצאה');
      return;
    }
    
    if (user && expenseToApprove.createdBy === user.id) {
      toast.error('לא ניתן לאשר הוצאה שהוספת בעצמך');
      return;
    }
    
    await updateExpenseStatus(id, 'approved');
  };

  const rejectExpense = async (id: string): Promise<void> => {
    const expenseToReject = expenses.find(expense => expense.id === id);
      
    if (!expenseToReject) {
      toast.error('ההוצאה לא נמצאה');
      return;
    }
    
    if (user && expenseToReject.createdBy === user.id) {
      toast.error('לא ניתן לדחות הוצאה שהוספת בעצמך');
      return;
    }
    
    await updateExpenseStatus(id, 'rejected');
  };

  const markAsPaid = async (id: string): Promise<void> => {
    const expenseToPay = expenses.find(expense => expense.id === id);
      
    if (!expenseToPay) {
      toast.error('ההוצאה לא נמצאה');
      return;
    }
    
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
