
import { useState, useEffect, useRef } from 'react';
import { Expense, Child } from './types';
import { User } from '@/contexts/AuthContext';
import { Account } from '@/contexts/auth/types';
import { expenseService } from '@/integrations/supabase/expenseService';

export interface ExpenseStorage {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  childrenList: Child[];
  setChildrenList: React.Dispatch<React.SetStateAction<Child[]>>;
  isLoading: boolean;
  refreshData: () => Promise<void>;
}

export const useExpenseStorage = (user: User | null, account: Account | null): ExpenseStorage => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [childrenList, setChildrenList] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const previousAccountId = useRef<string | null>(null);

  const refreshData = async () => {
    if (!user || !account) {
      console.log('No user or account, clearing data');
      setExpenses([]);
      setChildrenList([]);
      return;
    }
    
    console.log(`Loading data for user ${user.id} in account ${account.id} (${account.name})`);
    setIsLoading(true);
    try {
      // Load expenses from Supabase for the current account
      const fetchedExpenses = await expenseService.getExpenses(user, account);
      console.log(`Loaded ${fetchedExpenses.length} expenses for account ${account.name}`);
      setExpenses(fetchedExpenses);
      
      // Load children from Supabase for the current account
      const fetchedChildren = await expenseService.getChildren(user, account);
      console.log(`Loaded ${fetchedChildren.length} children for account ${account.name}`);
      setChildrenList(fetchedChildren);
    } catch (error) {
      console.error('Failed to load data:', error);
      // Clear data on error
      setExpenses([]);
      setChildrenList([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data when user or account changes
  useEffect(() => {
    const currentAccountId = account?.id || null;
    
    // Always load data if there's a user and account
    if (user && account) {
      console.log(`Account changed from ${previousAccountId.current} to ${currentAccountId}, refreshing data`);
      refreshData();
    } else {
      // Clear data if no user or account
      setExpenses([]);
      setChildrenList([]);
    }
    
    // Update the previous account ID
    previousAccountId.current = currentAccountId;
  }, [user?.id, account?.id]); // Track both user ID and account ID changes

  return {
    expenses,
    setExpenses,
    childrenList,
    setChildrenList,
    isLoading,
    refreshData
  };
};
