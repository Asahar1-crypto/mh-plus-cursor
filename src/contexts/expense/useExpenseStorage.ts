
import { useState, useEffect } from 'react';
import { Expense, Child } from './types';
import { User } from '@/contexts/AuthContext';

export interface ExpenseStorage {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  childrenList: Child[];
  setChildrenList: React.Dispatch<React.SetStateAction<Child[]>>;
}

export const useExpenseStorage = (user: User | null): ExpenseStorage => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [childrenList, setChildrenList] = useState<Child[]>([]);

  // Load children and expenses when user changes
  useEffect(() => {
    if (user) {
      // Load children for the user
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

  return {
    expenses,
    setExpenses,
    childrenList,
    setChildrenList
  };
};
