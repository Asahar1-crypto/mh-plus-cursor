import { useState } from 'react';
import { toast } from 'sonner';
import { Expense, Child } from './types';
import { User } from '@/contexts/AuthContext';
import { Account } from '@/contexts/auth/types';
import { expenseService } from '@/integrations/supabase/expenseService';
import { supabase } from '@/integrations/supabase/client';

export interface ExpenseActions {
  addExpense: (expense: Omit<Expense, 'id' | 'createdBy' | 'creatorName' | 'status' | 'approvedBy' | 'approvedAt'>) => Promise<void>;
  approveExpense: (id: string) => Promise<void>;
  approveAllRecurring: (id: string) => Promise<void>;
  rejectExpense: (id: string) => Promise<void>;
  markAsPaid: (id: string) => Promise<void>;
  updateExpenseStatus: (id: string, status: 'pending' | 'approved' | 'rejected' | 'paid') => Promise<void>;
  addChild: (child: Omit<Child, 'id'>) => Promise<void>;
  updateChild: (id: string, updates: Partial<Omit<Child, 'id'>>) => Promise<void>;
  uploadReceipt: (expenseId: string, receiptUrl: string) => Promise<void>;
  isSubmitting: boolean;
}

// Helper function to send SMS notification for pending expenses
const sendExpenseNotification = async (expenseId: string, accountId: string) => {
  try {
    console.log('Sending expense notification SMS for expense:', expenseId);
    const { data, error } = await supabase.functions.invoke('notify-expense-approval', {
      body: { expense_id: expenseId, account_id: accountId }
    });
    
    if (error) {
      console.error('Error sending expense notification:', error);
    } else {
      console.log('Expense notification result:', data);
    }
  } catch (error) {
    console.error('Failed to send expense notification:', error);
    // Don't throw - notification failure shouldn't block expense creation
  }
};

export const useExpenseActions = (
  user: User | null, 
  account: Account | null,
  expenses: Expense[], 
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>,
  childrenList: Child[],
  setChildrenList: React.Dispatch<React.SetStateAction<Child[]>>,
  refreshData: () => Promise<void>
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
      const result = await expenseService.addExpense(user, account, newExpense);
      console.log('Expense added successfully, refreshing data...');
      
      // Send SMS notification if expense is pending (needs approval)
      if (result.isPending) {
        sendExpenseNotification(result.id, account.id);
      }
      
      await refreshData(); // Refresh data to show new expense
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
      await expenseService.addChild(user, account, newChild);
      await refreshData(); // Refresh data instead of manual state update
      toast.success('הילד/ה נוספ/ה בהצלחה');
    } catch (error: any) {
      console.error('Failed to add child:', error);
      toast.error(`שגיאה בהוספת ילד/ה: ${error.message || 'אנא נסה שוב'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateChild = async (id: string, updates: Partial<Omit<Child, 'id'>>): Promise<void> => {
    if (!user) {
      toast.error('יש להתחבר כדי לעדכן פרטי ילד/ה');
      return;
    }

    if (!account) {
      toast.error('לא נמצא חשבון פעיל');
      return;
    }

    setIsSubmitting(true);
    try {
      await expenseService.updateChild(user, account, id, updates);
      await refreshData(); // Refresh data to show updated child
      toast.success('פרטי הילד/ה עודכנו בהצלחה');
    } catch (error: any) {
      console.error('Failed to update child:', error);
      toast.error(`שגיאה בעדכון פרטי ילד/ה: ${error.message || 'אנא נסה שוב'}`);
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
    console.log(`Starting updateExpenseStatus: id=${id}, status=${status}`);
    console.log(`User:`, user);
    console.log(`Account:`, account);
    
    if (!user) {
      console.error('User is null');
      toast.error('יש להתחבר כדי לעדכן סטטוס הוצאה');
      return;
    }

    if (!account) {
      console.error('Account is null');
      toast.error('לא נמצא חשבון פעיל');
      return;
    }
    
    setIsSubmitting(true);
    try {
      console.log(`Calling expenseService.updateExpenseStatus with:`, { user: user.id, account: account.id, id, status });
      await expenseService.updateExpenseStatus(user, account, id, status);
      console.log('updateExpenseStatus completed, calling refreshData...');
      await refreshData(); // Refresh data to show updated status
      
      let statusText = '';
      switch (status) {
        case 'approved': statusText = 'אושרה'; break;
        case 'rejected': statusText = 'נדחתה'; break;
        case 'paid': statusText = 'סומנה כשולמה'; break;
      }
      toast.success(`ההוצאה ${statusText} בהצלחה`);
      console.log(`Status update successful: ${statusText}`);
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

  const approveAllRecurring = async (id: string): Promise<void> => {
    const expenseToApprove = expenses.find(expense => expense.id === id);
      
    if (!expenseToApprove) {
      toast.error('ההוצאה לא נמצאה');
      return;
    }
    
    if (user && expenseToApprove.createdBy === user.id) {
      toast.error('לא ניתן לאשר הוצאה שהוספת בעצמך');
      return;
    }

    if (!expenseToApprove.recurringParentId) {
      toast.error('הוצאה זו אינה חלק מסדרה חוזרת');
      return;
    }

    if (!user || !account) {
      toast.error('יש להתחבר כדי לאשר הוצאות');
      return;
    }

    setIsSubmitting(true);
    try {
      await expenseService.approveAllRecurring(user, account, id);
      await refreshData();
      toast.success('🎉 ההוצאה אושרה! כל ההוצאות העתידיות יאושרו אוטומטית');
    } catch (error) {
      console.error('Failed to approve all recurring:', error);
      toast.error('שגיאה באישור ההוצאות החוזרות');
    } finally {
      setIsSubmitting(false);
    }
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
    approveAllRecurring,
    rejectExpense,
    markAsPaid,
    updateExpenseStatus,
    addChild,
    updateChild,
    uploadReceipt,
    isSubmitting
  };
};
