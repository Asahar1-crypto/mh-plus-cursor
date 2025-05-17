import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../AuthContext';
import { Expense, Child, ExpenseContextType } from './types';
import {
  getPendingExpenses as getFilteredPendingExpenses,
  getApprovedExpenses as getFilteredApprovedExpenses,
  getPaidExpenses as getFilteredPaidExpenses,
  getTotalPending as calculateTotalPending,
  getTotalApproved as calculateTotalApproved,
  getExpensesByChild as filterExpensesByChild
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
    }
  }, [user]);

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

  // Use utility functions but pass in the current expenses state
  const getPendingExpenses = () => getFilteredPendingExpenses(expenses);
  const getApprovedExpenses = () => getFilteredApprovedExpenses(expenses);
  const getPaidExpenses = () => getFilteredPaidExpenses(expenses);
  const getTotalPending = () => calculateTotalPending(expenses);
  const getTotalApproved = () => calculateTotalApproved(expenses);
  const getExpensesByChild = (childId: string) => filterExpensesByChild(expenses, childId);

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
  
  function approveExpense(id: string): Promise<void> {
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
    return Promise.resolve();
  }

  function rejectExpense(id: string): Promise<void> {
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
    return Promise.resolve();
  }

  function markAsPaid(id: string): Promise<void> {
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
    return Promise.resolve();
  }
};
