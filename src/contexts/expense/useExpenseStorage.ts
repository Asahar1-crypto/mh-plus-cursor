
import { useState, useEffect } from 'react';
import { Expense, Child } from './types';
import { User } from '@/contexts/AuthContext';
import { expenseService } from '@/integrations/supabase/expenseService';

export interface ExpenseStorage {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  childrenList: Child[];
  setChildrenList: React.Dispatch<React.SetStateAction<Child[]>>;
  isLoading: boolean;
}

export const useExpenseStorage = (user: User | null): ExpenseStorage => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [childrenList, setChildrenList] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load data when user changes
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setExpenses([]);
        setChildrenList([]);
        return;
      }
      
      setIsLoading(true);
      try {
        // Load expenses from Supabase
        const fetchedExpenses = await expenseService.getExpenses(user);
        setExpenses(fetchedExpenses);
        
        // Load children from Supabase
        const fetchedChildren = await expenseService.getChildren(user);
        setChildrenList(fetchedChildren);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [user]);

  return {
    expenses,
    setExpenses,
    childrenList,
    setChildrenList,
    isLoading
  };
};
