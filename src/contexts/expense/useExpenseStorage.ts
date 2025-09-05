
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
      setExpenses([]);
      setChildrenList([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    console.log(`🔄 Starting data refresh for account: ${account.name} (${account.id})`);
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.error('Data loading timeout after 10 seconds');
      setIsLoading(false);
    }, 10000);
    
    try {
      // Load expenses from Supabase for the current account
      console.log('📊 Loading expenses...');
      const fetchedExpenses = await expenseService.getExpenses(user, account);
      console.log(`✅ Loaded ${fetchedExpenses.length} expenses`);
      setExpenses(fetchedExpenses);
      
      // Load children from Supabase for the current account
      console.log('👶 Loading children...');
      const fetchedChildren = await expenseService.getChildren(user, account);
      console.log(`✅ Loaded ${fetchedChildren.length} children`);
      setChildrenList(fetchedChildren);
      
      // Update the current account reference
      currentAccountRef.current = account.id;
      console.log('✅ Data refresh completed successfully');
    } catch (error) {
      console.error('❌ Failed to load data:', error);
      // Clear data on error
      setExpenses([]);
      setChildrenList([]);
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  // Load data when user or account changes
  useEffect(() => {
    // Check if account actually changed
    const accountChanged = account?.id !== currentAccountRef.current;
    
    if (user && account) {
      if (accountChanged || currentAccountRef.current === null) {
        // Clear data immediately when switching accounts
        setExpenses([]);
        setChildrenList([]);
        refreshData();
      }
    } else {
      // Clear data if no user or account
      setExpenses([]);
      setChildrenList([]);
      currentAccountRef.current = null;
    }
  }, [user?.id, account?.id]);

  // Add visibility change listener for auto-refresh when returning to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && account) {
        refreshData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, account]);

  // Add focus listener for auto-refresh when returning to window
  // Only refresh if the window was actually inactive (not just modal interactions)
  useEffect(() => {
    let windowWasInactive = false;

    const handleBlur = () => {
      windowWasInactive = true;
    };

    const handleFocus = () => {
      if (windowWasInactive && user && account) {
        refreshData();
        windowWasInactive = false;
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, account]);

  return {
    expenses,
    setExpenses,
    childrenList,
    setChildrenList,
    isLoading,
    refreshData
  };
};
