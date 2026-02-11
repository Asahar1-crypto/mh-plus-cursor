
import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useExpense } from '@/contexts/ExpenseContext';
import { Expense } from '@/contexts/expense/types';
import { ExpenseFilters } from '@/components/expenses/ExpenseFilters';
import { ExpensesTable } from '@/components/expenses/ExpensesTable';
import { AddExpenseModal } from '@/components/expenses/AddExpenseModal';
import { RecurringExpensesTable } from '@/components/expenses/RecurringExpensesTable';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Plus, TrendingUp, CreditCard, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/auth';


const ExpensesPage = () => {
  const location = useLocation();
  const modalRef = useRef<any>(null);
  const { account } = useAuth();
  const isPersonalPlan = account?.plan_slug === 'personal';
  
  const { 
    expenses, 
    childrenList, 
    approveExpense,
    approveAllRecurring,
    rejectExpense, 
    markAsPaid,
    isLoading,
    refreshData
  } = useExpense();

  // Create a status update function that uses existing functions
  const updateExpenseStatus = async (id: string, status: Expense['status']) => {
    switch (status) {
      case 'approved':
        return await approveExpense(id);
      case 'rejected':
        return await rejectExpense(id);
      case 'paid':
        return await markAsPaid(id);
      case 'pending':
        // For now, we'll handle pending status separately if needed
        console.log('Pending status change not implemented yet');
        break;
      default:
        console.warn('Unknown status:', status);
    }
  };

  const handleRefresh = async () => {
    await refreshData();
  };

  // Check if we should auto-open the modal
  useEffect(() => {
    if (location.state?.openModal) {
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        const modalButton = document.querySelector('[data-modal-trigger="add-expense"]');
        if (modalButton) {
          (modalButton as HTMLElement).click();
        }
      }, 100);
    }
  }, [location.state]);
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<Expense['status'] | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedPayer, setSelectedPayer] = useState<string | null>(null);

  // Filter regular expenses (non-recurring) based on selected criteria
  const filteredExpenses = expenses
    .filter(expense => !expense.isRecurring) // Show only non-recurring expenses
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

  // Get recurring expenses only
  const recurringExpenses = expenses.filter(expense => expense.isRecurring);

  // Calculate quick stats
  const stats = {
    total: filteredExpenses.length,
    pending: filteredExpenses.filter(e => e.status === 'pending').length,
    approved: filteredExpenses.filter(e => e.status === 'approved').length,
    paid: filteredExpenses.filter(e => e.status === 'paid').length,
    totalAmount: filteredExpenses.reduce((sum, e) => sum + e.amount, 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30" dir="rtl">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-pulse [animation-delay:2s]"></div>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto py-4 sm:py-8 px-4 sm:px-6">
        {/* Modern Header */}
        <div className="mb-6 sm:mb-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 sm:gap-6">
            {/* Title Section */}
            <div className="space-y-1 sm:space-y-2">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl backdrop-blur-sm border border-primary/20">
                  <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {isPersonalPlan ? 'ניהול הוצאות' : 'ניהול הוצאות משותפות'}
                  </h1>
                  <p className="text-sm sm:text-base text-muted-foreground mt-1 hidden sm:block">
                    {isPersonalPlan ? 'צפייה והוספת הוצאות' : 'צפייה, הוספה ואישור של הוצאות משותפות'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isLoading}
                size="sm"
                className="flex items-center gap-1 sm:gap-2 bg-background/80 backdrop-blur-sm border-border/50 hover:bg-background hover:border-primary/30 transition-all duration-300 flex-1 sm:flex-none"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">רענון</span>
              </Button>
              <div className="flex-1 sm:flex-none">
                <AddExpenseModal onSubmitSuccess={refreshData} />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${isPersonalPlan ? 'lg:grid-cols-4' : 'lg:grid-cols-5'} gap-3 sm:gap-4 mb-6 sm:mb-8 animate-fade-in [animation-delay:200ms]`}>
          <Card className="bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-300 group">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors duration-300">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground truncate">סה"כ הוצאות</p>
                  <p className="text-base sm:text-lg font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {!isPersonalPlan && (
          <Card className="bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-300 group">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-yellow-500/10 rounded-lg group-hover:bg-yellow-500/20 transition-colors duration-300">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground truncate">ממתינות</p>
                  <p className="text-base sm:text-lg font-bold">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          )}

          <Card className="bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-300 group">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors duration-300">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground truncate">מאושרות</p>
                  <p className="text-base sm:text-lg font-bold">{stats.approved}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-300 group">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors duration-300">
                  <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground truncate">שולמו</p>
                  <p className="text-base sm:text-lg font-bold">{stats.paid}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-300 group sm:col-span-2 md:col-span-1 lg:col-span-1">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors duration-300">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground truncate">סכום כולל</p>
                  <p className="text-base sm:text-lg font-bold">₪{stats.totalAmount.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content with Tabs */}
        <Card className="bg-gradient-to-br from-card/90 to-card/80 backdrop-blur-lg border border-border/50 shadow-2xl animate-fade-in [animation-delay:400ms]">
          <CardContent className="p-4 sm:p-6">
            <Tabs defaultValue="regular" className="space-y-4 sm:space-y-6">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50 backdrop-blur-sm">
                <TabsTrigger 
                  value="regular" 
                  className="data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all duration-300 text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">הוצאות רגילות</span>
                  <span className="sm:hidden">רגילות</span>
                  <span className="mr-1">({filteredExpenses.length})</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="recurring"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all duration-300 text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">הוצאות חוזרות</span>
                  <span className="sm:hidden">חוזרות</span>
                  <span className="mr-1">({recurringExpenses.length})</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="regular" className="space-y-4 sm:space-y-6 animate-fade-in">
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
                  approveAllRecurring={approveAllRecurring}
                  rejectExpense={rejectExpense}
                  markAsPaid={markAsPaid}
                  updateExpenseStatus={updateExpenseStatus}
                />
              </TabsContent>

              <TabsContent value="recurring" className="space-y-4 sm:space-y-6 animate-fade-in">
                <RecurringExpensesTable 
                  expenses={recurringExpenses}
                  childrenList={childrenList}
                  refreshData={refreshData}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExpensesPage;
