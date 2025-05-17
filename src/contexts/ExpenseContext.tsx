
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';

export interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string;
  category: string;
  childId?: string;
  childName?: string;
  createdBy: string;
  creatorName: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  receipt?: string;
  isRecurring: boolean;
  frequency?: 'monthly' | 'weekly' | 'yearly';
}

export interface Child {
  id: string;
  name: string;
  birthDate: string;
}

interface ExpenseContextType {
  expenses: Expense[];
  childrenList: Child[];
  addExpense: (expense: Omit<Expense, 'id' | 'createdBy' | 'creatorName' | 'status'>) => Promise<void>;
  approveExpense: (id: string) => Promise<void>;
  rejectExpense: (id: string) => Promise<void>;
  markAsPaid: (id: string) => Promise<void>;
  addChild: (child: Omit<Child, 'id'>) => Promise<void>;
  getPendingExpenses: () => Expense[];
  getApprovedExpenses: () => Expense[];
  getPaidExpenses: () => Expense[];
  getTotalPending: () => number;
  getTotalApproved: () => number;
  getExpensesByChild: (childId: string) => Expense[];
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export const useExpense = () => {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error('useExpense must be used within an ExpenseProvider');
  }
  return context;
};

interface ExpenseProviderProps {
  children: ReactNode;
}

export const ExpenseProvider = ({ children }: ExpenseProviderProps) => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [childrenList, setChildrenList] = useState<Child[]>([]);

  const addExpense = async (newExpense: Omit<Expense, 'id' | 'createdBy' | 'creatorName' | 'status'>) => {
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
        status: 'pending'
      };
      
      setExpenses(prev => [...prev, expense]);
      toast.success('ההוצאה נוספה בהצלחה');
    } catch (error) {
      console.error('Failed to add expense:', error);
      toast.error('הוספת ההוצאה נכשלה, אנא נסה שוב.');
    }
  };

  const approveExpense = async (id: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setExpenses(prev => 
        prev.map(expense => 
          expense.id === id ? { ...expense, status: 'approved' } : expense
        )
      );
      
      toast.success('ההוצאה אושרה בהצלחה');
    } catch (error) {
      console.error('Failed to approve expense:', error);
      toast.error('אישור ההוצאה נכשל, אנא נסה שוב.');
    }
  };

  const rejectExpense = async (id: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setExpenses(prev => 
        prev.map(expense => 
          expense.id === id ? { ...expense, status: 'rejected' } : expense
        )
      );
      
      toast.success('ההוצאה נדחתה');
    } catch (error) {
      console.error('Failed to reject expense:', error);
      toast.error('דחיית ההוצאה נכשלה, אנא נסה שוב.');
    }
  };

  const markAsPaid = async (id: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setExpenses(prev => 
        prev.map(expense => 
          expense.id === id ? { ...expense, status: 'paid' } : expense
        )
      );
      
      toast.success('ההוצאה סומנה כשולמה');
    } catch (error) {
      console.error('Failed to mark expense as paid:', error);
      toast.error('סימון ההוצאה כשולמה נכשל, אנא נסה שוב.');
    }
  };

  const addChild = async (newChild: Omit<Child, 'id'>) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const child: Child = {
        ...newChild,
        id: `child-${Date.now()}`
      };
      
      setChildrenList(prev => [...prev, child]);
      toast.success('הילד/ה נוספ/ה בהצלחה');
    } catch (error) {
      console.error('Failed to add child:', error);
      toast.error('הוספת הילד/ה נכשלה, אנא נסה שוב.');
    }
  };

  const getPendingExpenses = () => expenses.filter(e => e.status === 'pending');
  
  const getApprovedExpenses = () => expenses.filter(e => e.status === 'approved');
  
  const getPaidExpenses = () => expenses.filter(e => e.status === 'paid');
  
  const getTotalPending = () => getPendingExpenses().reduce((acc, curr) => acc + curr.amount, 0);
  
  const getTotalApproved = () => getApprovedExpenses().reduce((acc, curr) => acc + curr.amount, 0);
  
  const getExpensesByChild = (childId: string) => expenses.filter(e => e.childId === childId);

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
      getTotalPending,
      getTotalApproved,
      getExpensesByChild
    }}>
      {children}
    </ExpenseContext.Provider>
  );
};
