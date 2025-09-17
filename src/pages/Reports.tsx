import React from 'react';
import { useAuth } from '@/contexts/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FoodBudgetChart as DashboardFoodBudgetChart } from '@/components/dashboard/FoodBudgetChart';
import { CategoryExpensesChart } from '@/components/reports/CategoryExpensesChart';

const Reports = () => {
  const { user, account, isLoading } = useAuth();

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">לא נבחר חשבון</h2>
          <p className="text-muted-foreground">יש לבחור חשבון כדי לצפות בדוחות</p>
        </div>
      </div>
    );
  }


  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">דוחות ונתונים</h1>
      </div>

      <div className="space-y-6">
        {/* Category Expenses Chart */}
        <CategoryExpensesChart />
      </div>
    </div>
  );
};

export default Reports;