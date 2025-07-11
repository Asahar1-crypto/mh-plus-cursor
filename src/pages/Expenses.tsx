
import React, { useState } from 'react';
import { useExpense } from '@/contexts/ExpenseContext';
import { Expense } from '@/contexts/expense/types';
import { ExpenseFilters } from '@/components/expenses/ExpenseFilters';
import { ExpensesTable } from '@/components/expenses/ExpensesTable';


const ExpensesPage = () => {
  const { 
    expenses, 
    childrenList, 
    approveExpense, 
    rejectExpense, 
    markAsPaid 
  } = useExpense();
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<Expense['status'] | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

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
    });

  return (
    <div className="container mx-auto py-6 animate-fade-in">
      <div className="mb-6">
        <div>
          <h1 className="text-3xl font-bold">ניהול הוצאות משותפות</h1>
          <p className="text-muted-foreground">צפייה, הוספה ואישור של הוצאות משותפות</p>
        </div>
      </div>

      <div className="space-y-6">
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
