
import React, { useState } from 'react';
import { useExpense } from '@/contexts/ExpenseContext';
import { Expense } from '@/contexts/expense/types';
import { ExpenseFilters } from '@/components/expenses/ExpenseFilters';
import { ExpensesTable } from '@/components/expenses/ExpensesTable';
import { AddExpenseModal } from '@/components/expenses/AddExpenseModal';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';


const ExpensesPage = () => {
  const { 
    expenses, 
    childrenList, 
    approveExpense, 
    rejectExpense, 
    markAsPaid,
    isLoading,
    refreshData
  } = useExpense();

  const handleRefresh = async () => {
    await refreshData();
  };
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<Expense['status'] | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedPayer, setSelectedPayer] = useState<string | null>(null);

  // Filter expenses based on selected criteria
  const filteredExpenses = expenses
    .filter(expense => selectedCategory ? expense.category === selectedCategory : true)
    .filter(expense => selectedChild ? expense.childId === selectedChild : true)
    .filter(expense => selectedStatus ? expense.status === selectedStatus : true)
    .filter(expense => {
      if (selectedMonth !== null && selectedYear !== null) {
        const expenseDate = new Date(expense.date);
        return (
          expenseDate.getMonth() === selectedMonth && 
          expenseDate.getFullYear() === selectedYear
        );
      }
      return true;
    })
    .filter(expense => {
      if (!selectedPayer) return true;
      
      if (selectedPayer === 'split') {
        // Show only split expenses
        return expense.splitEqually;
      } else {
        // Show expenses where the specific user should pay
        if (expense.splitEqually) {
          // For split expenses, both users should pay
          return true;
        } else {
          // For non-split expenses, only the designated payer should pay
          return expense.paidById === selectedPayer;
        }
      }
    });

  return (
    <div className="w-full max-w-7xl mx-auto py-3 sm:py-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">ניהול הוצאות משותפות</h1>
          <p className="text-sm sm:text-base text-muted-foreground">צפייה, הוספה ואישור של הוצאות משותפות</p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 flex-1 sm:flex-none text-xs sm:text-sm"
          >
            <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${isLoading ? 'animate-spin' : ''}`} />
            רענון
          </Button>
          <div className="flex-1 sm:flex-none">
            <AddExpenseModal />
          </div>
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {/* Filtering options */}
        <ExpenseFilters 
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedChild={selectedChild}
          setSelectedChild={setSelectedChild}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          selectedPayer={selectedPayer}
          setSelectedPayer={setSelectedPayer}
          childrenList={childrenList}
        />

        {/* Expenses Table */}
        <ExpensesTable 
          expenses={filteredExpenses}
          approveExpense={approveExpense}
          rejectExpense={rejectExpense}
          markAsPaid={markAsPaid}
        />
      </div>
    </div>
  );
};

export default ExpensesPage;
