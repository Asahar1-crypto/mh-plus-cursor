
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
  const currentAccountRef = useRef<string | null>(null);

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
      
      // Update the current account reference
      currentAccountRef.current = account.id;
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
    console.log('useExpenseStorage effect triggered', { 
      userId: user?.id, 
      accountId: account?.id,
      accountName: account?.name,
      previousAccountId: currentAccountRef.current
    });
    
    // Check if account actually changed
    const accountChanged = account?.id !== currentAccountRef.current;
    
    if (user && account) {
      if (accountChanged || currentAccountRef.current === null) {
        console.log('Account changed or first load, refreshing data...');
        // Clear data immediately when switching accounts
        setExpenses([]);
        setChildrenList([]);
        refreshData();
      }
    } else {
      // Clear data if no user or account
      console.log('No user or account, clearing data');
      setExpenses([]);
      setChildrenList([]);
      currentAccountRef.current = null;
    }
  }, [user?.id, account?.id]);

  return {
    expenses,
    setExpenses,
    childrenList,
    setChildrenList,
    isLoading,
    refreshData
  };
};
