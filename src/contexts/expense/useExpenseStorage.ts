
import { useState, useEffect, useRef } from 'react';
import { Expense, Child } from './types';
import { User } from '@/contexts/AuthContext';
import { Account } from '@/contexts/auth/types';
import { expenseService } from '@/integrations/supabase/expenseService';
import { categoryService, Category } from '@/integrations/supabase/categoryService';

export interface ExpenseStorage {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  childrenList: Child[];
  setChildrenList: React.Dispatch<React.SetStateAction<Child[]>>;
  categoriesList: Category[];
  setCategoriesList: React.Dispatch<React.SetStateAction<Category[]>>;
  isLoading: boolean;
  refreshData: () => Promise<void>;
}

export const useExpenseStorage = (user: User | null, account: Account | null): ExpenseStorage => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [childrenList, setChildrenList] = useState<Child[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const currentAccountRef = useRef<string | null>(null);

  const refreshData = async () => {
    if (!user || !account) {
      setExpenses([]);
      setChildrenList([]);
      setCategoriesList([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    // Refreshing data for current account
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.error('Data loading timeout after 10 seconds');
      setIsLoading(false);
    }, 10000);
    
    try {
      // Load expenses from Supabase for the current account
      const fetchedExpenses = await expenseService.getExpenses(user, account);
      setExpenses(fetchedExpenses);
      
      // Load children from Supabase for the current account
      const fetchedChildren = await expenseService.getChildren(user, account);
      setChildrenList(fetchedChildren);
      
      // Load categories
      try {
        const fetchedCategories = await categoryService.getCategories(account);
        setCategoriesList(fetchedCategories);
      } catch {
        setCategoriesList([]);
      }
      
      // Update the current account reference
      currentAccountRef.current = account.id;
    } catch (error) {
      console.error('Failed to load data:', error);
      setExpenses([]);
      setChildrenList([]);
      setCategoriesList([]);
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
        setExpenses([]);
        setChildrenList([]);
        setCategoriesList([]);
        refreshData();
      }
    } else {
      setExpenses([]);
      setChildrenList([]);
      setCategoriesList([]);
      currentAccountRef.current = null;
    }
  }, [user?.id, account?.id]);

  // Add visibility change listener for auto-refresh when returning to tab
  // Skip refresh if was hidden < 2s (file picker, camera dialog - avoid replacing modal with skeleton)
  useEffect(() => {
    let hiddenAt: number | null = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
      } else if (hiddenAt !== null && user && account) {
        const wasHiddenMs = Date.now() - hiddenAt;
        if (wasHiddenMs > 2000) {
          refreshData();
        }
        hiddenAt = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, account]);

  // Removed blur/focus listener - it caused refresh when opening file picker,
  // camera, or any native dialog. visibilitychange handles tab switch.

  return {
    expenses,
    setExpenses,
    childrenList,
    setChildrenList,
    categoriesList,
    setCategoriesList,
    isLoading,
    refreshData
  };
};
