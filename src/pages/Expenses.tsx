
import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useExpense } from '@/contexts/ExpenseContext';
import { Expense } from '@/contexts/expense/types';
import { useExpenseFilters } from '@/hooks/useExpenseFilters';
import { ExpenseFilters } from '@/components/expenses/ExpenseFilters';
import { ExpensesTable } from '@/components/expenses/ExpensesTable';
import { AddExpenseModal } from '@/components/expenses/AddExpenseModal';
import { RecurringExpensesTable } from '@/components/expenses/RecurringExpensesTable';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Plus, TrendingUp, CreditCard, Clock, Download } from 'lucide-react';
import { toast } from 'sonner';
import { exportExpensesToCSV, exportExpensesToPDF } from '@/utils/exportUtils';
import { useAuth } from '@/contexts/auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BudgetModal } from '@/components/expenses/BudgetModal';
import { BudgetAlertBanner } from '@/components/expenses/BudgetAlertBanner';
import { ExpensesPageSkeleton } from '@/components/expenses/ExpensesPageSkeleton';


const ExpensesPage = () => {
  const location = useLocation();
  const modalRef = useRef<any>(null);
  const { user, account, profile } = useAuth();
  const isPersonalPlan = account?.plan_slug === 'personal';

  const { data: isAdmin } = useQuery({
    queryKey: ['is-admin', account?.id, user?.id],
    queryFn: async () => {
      if (!account?.id || !user?.id) return false;
      const { data, error } = await supabase.rpc('is_account_admin', {
        account_uuid: account.id,
        user_uuid: user.id
      });
      if (error) return false;
      return data || false;
    },
    enabled: !!account?.id && !!user?.id
  });
  
  const {
    selectedCategory, setSelectedCategory,
    selectedChild, setSelectedChild,
    selectedStatus, setSelectedStatus,
    selectedMonth, setSelectedMonth,
    selectedYear, setSelectedYear,
    selectedPayer, setSelectedPayer,
    activeTab, setActiveTab,
    applyFilters,
  } = useExpenseFilters();
  
  const {
    expenses,
    childrenList,
    categoriesList,
    approveExpense,
    approveAllRecurring,
    rejectExpense,
    markAsPaid,
    addExpense,
    updateExpense,
    updateExpenseStatus: updateStatusFromContext,
    deleteExpense,
    updateRecurringActive,
    isLoading,
    refreshData
  } = useExpense();

  const isSuperAdmin = !!profile?.is_super_admin;

  // Create a status update function - super admins can set any status directly
  const updateExpenseStatus = async (id: string, status: Expense['status']) => {
    if (isSuperAdmin) {
      return await updateStatusFromContext(id, status);
    }
    switch (status) {
      case 'approved':
        return await approveExpense(id);
      case 'rejected':
        return await rejectExpense(id);
      case 'paid':
        return await markAsPaid(id);
      case 'pending':
        return await updateStatusFromContext(id, 'pending');
      default:
        break;
    }
  };

  const handleRefresh = async () => {
    await refreshData();
  };

  const handleDuplicateExpense = async (expense: Expense) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await addExpense({
        amount: expense.amount,
        description: expense.description,
        category: expense.category,
        date: today,
        childId: expense.childId,
        childName: expense.childName,
        paidById: expense.paidById,
        splitEqually: expense.splitEqually,
        isRecurring: false,
      });
      toast.success('ההוצאה שוכפלה בהצלחה!');
      await refreshData();
    } catch (error) {
      toast.error('שגיאה בשכפול ההוצאה');
    }
  };

  // Check if we should auto-open the modal
  useEffect(() => {
    if (location.state?.openModal) {
      setTimeout(() => {
        const modalButton = document.querySelector('[data-modal-trigger="add-expense"]');
        if (modalButton) {
          (modalButton as HTMLElement).click();
        }
      }, 100);
    }
  }, [location.state]);

  // Loading state
  if (isLoading) {
    return <ExpensesPageSkeleton />;
  }

  // Filter regular expenses (non-recurring) via the centralised filter hook
  const filteredExpenses = applyFilters(expenses);

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 overflow-x-hidden" dir="rtl">
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
            <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => exportExpensesToCSV(filteredExpenses)}
                disabled={filteredExpenses.length === 0}
                size="sm"
                className="flex items-center gap-1 sm:gap-2 bg-background/80 backdrop-blur-sm border-border/50 hover:bg-background hover:border-primary/30 transition-all duration-300 flex-1 sm:flex-none"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">CSV</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => exportExpensesToPDF(filteredExpenses)}
                disabled={filteredExpenses.length === 0}
                size="sm"
                className="flex items-center gap-1 sm:gap-2 bg-background/80 backdrop-blur-sm border-border/50 hover:bg-background hover:border-primary/30 transition-all duration-300 flex-1 sm:flex-none"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
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
              <BudgetModal isAdmin={isAdmin || false} />
              <div className="flex-none shrink-0">
                <AddExpenseModal onSubmitSuccess={refreshData} />
              </div>
            </div>
          </div>
        </div>

        {/* Budget Alerts - when approaching or exceeding budget */}
        <div className="mb-4 sm:mb-6 animate-fade-in [animation-delay:150ms]">
          <BudgetAlertBanner selectedMonth={selectedMonth} selectedYear={selectedYear} />
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
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'regular' | 'recurring')} className="space-y-4 sm:space-y-6">
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
                  categoriesList={categoriesList}
                />

                {/* Expenses Table */}
                <ExpensesTable
                  expenses={filteredExpenses}
                  approveExpense={approveExpense}
                  approveAllRecurring={approveAllRecurring}
                  rejectExpense={rejectExpense}
                  markAsPaid={markAsPaid}
                  updateExpense={updateExpense}
                  updateExpenseStatus={updateExpenseStatus}
                  deleteExpense={deleteExpense}
                  refreshData={refreshData}
                  isSuperAdmin={isSuperAdmin}
                  onDuplicateExpense={handleDuplicateExpense}
                />
              </TabsContent>

              <TabsContent value="recurring" className="space-y-4 sm:space-y-6 animate-fade-in">
                <RecurringExpensesTable 
                  expenses={recurringExpenses}
                  childrenList={childrenList}
                  refreshData={refreshData}
                  updateRecurringActive={updateRecurringActive}
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
