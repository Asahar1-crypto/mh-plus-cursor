import React from 'react';
import { useAuth } from '@/contexts/auth';
import { useExpense } from '@/contexts/ExpenseContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExpensesTable } from '@/components/expenses/ExpensesTable';
import FoodBudgetChart from '@/components/reports/FoodBudgetChart';
import { FoodBudgetChart as DashboardFoodBudgetChart } from '@/components/dashboard/FoodBudgetChart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Reports = () => {
  const { user, account, isLoading } = useAuth();
  const { 
    expenses, 
    approveExpense, 
    rejectExpense, 
    markAsPaid,
    refreshData
  } = useExpense();

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

  // Filter pending/approved expenses that need action
  const pendingExpenses = expenses.filter(expense => expense.status === 'pending');
  const approvedExpenses = expenses.filter(expense => expense.status === 'approved');
  
  // Create a status update function
  const updateExpenseStatus = async (id: string, status: 'pending' | 'approved' | 'rejected' | 'paid') => {
    switch (status) {
      case 'approved':
        return await approveExpense(id);
      case 'rejected':
        return await rejectExpense(id);
      case 'paid':
        return await markAsPaid(id);
      default:
        console.warn('Unknown status:', status);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">דוחות ונתונים</h1>
      </div>

      <Tabs defaultValue="charts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="charts">תרשימים</TabsTrigger>
          <TabsTrigger value="pending">ממתינות לאישור ({pendingExpenses.length})</TabsTrigger>
          <TabsTrigger value="approved">ממתינות לתשלום ({approvedExpenses.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>תקציב מזונות חודשי</CardTitle>
              <CardDescription>
                מעקב אחר הוצאות המזונות לעומת התקציב החודשי
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DashboardFoodBudgetChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>הוצאות ממתינות לאישור</CardTitle>
              <CardDescription>
                הוצאות שהוגשו וממתינות לאישור מנהל החשבון
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingExpenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  אין הוצאות ממתינות לאישור
                </div>
              ) : (
                <ExpensesTable 
                  expenses={pendingExpenses}
                  approveExpense={approveExpense}
                  rejectExpense={rejectExpense}
                  markAsPaid={markAsPaid}
                  updateExpenseStatus={updateExpenseStatus}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>הוצאות ממתינות לתשלום</CardTitle>
              <CardDescription>
                הוצאות מאושרות שממתינות לתשלום - כולל הוצאות מחודשים קודמים
              </CardDescription>
            </CardHeader>
            <CardContent>
              {approvedExpenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  אין הוצאות ממתינות לתשלום
                </div>
              ) : (
                <ExpensesTable 
                  expenses={approvedExpenses}
                  approveExpense={approveExpense}
                  rejectExpense={rejectExpense}
                  markAsPaid={markAsPaid}
                  updateExpenseStatus={updateExpenseStatus}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;