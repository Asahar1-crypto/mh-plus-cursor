import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Expense } from '@/contexts/expense/types';

/**
 * Central hook that manages all expense filter state via URL search params.
 * Syncing filters to the URL means users can share/bookmark filtered views,
 * and the browser back-button restores the previous filter selection.
 */
export const useExpenseFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read current filter values from the URL
  const selectedCategory = searchParams.get('category');
  const selectedChild = searchParams.get('child');
  const selectedStatus = searchParams.get('status') as Expense['status'] | null;
  const selectedMonth = parseInt(
    searchParams.get('month') ?? String(new Date().getMonth())
  );
  const selectedYear = parseInt(
    searchParams.get('year') ?? String(new Date().getFullYear())
  );
  const selectedPayer = searchParams.get('payer');
  const activeTab = (searchParams.get('tab') as 'regular' | 'recurring') ?? 'regular';

  // Generic setter – keeps existing params and replaces/deletes the given key
  const setFilter = useCallback(
    (key: string, value: string | null) => {
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev);
          if (value === null || value === '') next.delete(key);
          else next.set(key, value);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setSelectedCategory = useCallback((v: string | null) => setFilter('category', v), [setFilter]);
  const setSelectedChild = useCallback((v: string | null) => setFilter('child', v), [setFilter]);
  const setSelectedStatus = useCallback((v: Expense['status'] | null) => setFilter('status', v), [setFilter]);
  const setSelectedMonth = useCallback((v: number) => setFilter('month', String(v)), [setFilter]);
  const setSelectedYear = useCallback((v: number) => setFilter('year', String(v)), [setFilter]);
  const setSelectedPayer = useCallback((v: string | null) => setFilter('payer', v), [setFilter]);
  const setActiveTab = useCallback((v: 'regular' | 'recurring') => setFilter('tab', v), [setFilter]);

  /**
   * Applies all active filters to an array of (non-recurring) expenses.
   * Memoized so the reference only changes when filter values change.
   */
  const applyFilters = useCallback(
    (expenses: Expense[]): Expense[] =>
      expenses
        .filter(e => !e.isRecurring)
        .filter(e => (selectedCategory ? e.category === selectedCategory : true))
        .filter(e => (selectedChild ? e.childId === selectedChild : true))
        .filter(e => (selectedStatus ? e.status === selectedStatus : true))
        .filter(e => {
          const d = new Date(e.date);
          return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        })
        .filter(e => {
          if (!selectedPayer) return true;
          if (selectedPayer === 'split') return e.splitEqually;
          if (e.splitEqually) return true;
          return e.paidById === selectedPayer;
        }),
    [selectedCategory, selectedChild, selectedStatus, selectedMonth, selectedYear, selectedPayer]
  );

  return {
    // Values
    selectedCategory,
    selectedChild,
    selectedStatus,
    selectedMonth,
    selectedYear,
    selectedPayer,
    activeTab,
    // Setters
    setSelectedCategory,
    setSelectedChild,
    setSelectedStatus,
    setSelectedMonth,
    setSelectedYear,
    setSelectedPayer,
    setActiveTab,
    // Helper
    applyFilters,
  };
};
