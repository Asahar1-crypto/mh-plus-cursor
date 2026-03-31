import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { useExpense } from '@/contexts/ExpenseContext';
import { ErrorState } from '@/components/ui/state-views';
import { Card, CardContent } from '@/components/ui/card';
import { CategoryExpensesChart } from '@/components/reports/CategoryExpensesChart';
import { ChildrenExpensesChart } from '@/components/reports/ChildrenExpensesChart';
import FoodBudgetChart from '@/components/reports/FoodBudgetChart';
import { ReportsPeriodFilter } from '@/components/reports/ReportsPeriodFilter';
import { BarChart3, TrendingUp, Wallet, Users, Tag, ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react';
import { ReportsSkeleton } from '@/components/reports/ReportsSkeleton';
import { MonthlyTrendChart } from '@/components/reports/MonthlyTrendChart';
import BudgetDeviationChart from '@/components/reports/BudgetDeviationChart';
import { filterExpensesByPeriod, type PeriodFilter } from '@/utils/reportsPeriodUtils';
import { isDateInCycle, getCurrentCycle } from '@/utils/billingCycleUtils';

const Reports = () => {
  const navigate = useNavigate();
  const { user, account, isLoading } = useAuth();
  const { expenses, error: expenseError, refreshData } = useExpense();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>({ type: 'all' });

  const handleCategoryClick = (category: string) => {
    const params = new URLSearchParams({ category });
    if (periodFilter.type === 'month' && periodFilter.month != null && periodFilter.year != null) {
      params.set('month', String(periodFilter.month - 1)); // Expenses uses 0-based month
      params.set('year', String(periodFilter.year));
    }
    navigate(`/expenses?${params.toString()}`);
  };

  const filteredExpenses = useMemo(() => {
    const valid = expenses.filter(exp => exp.status !== 'rejected');
    return filterExpensesByPeriod(valid, periodFilter, account?.billing_cycle_start_day ?? 1);
  }, [expenses, periodFilter, account?.billing_cycle_start_day]);

  // Calculate overview stats based on filtered period
  const overviewStats = useMemo(() => {
    const validExpenses = expenses.filter(exp => exp.status !== 'rejected');
    const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalCount = filteredExpenses.length;

    // Get unique categories and children from filtered data
    const categories = new Set(filteredExpenses.map(exp => exp.category || 'אחר'));
    const children = new Set(filteredExpenses.map(exp => exp.childName).filter(Boolean));

    // Current cycle vs previous cycle comparison (billing-day aware)
    const billingDay = account?.billing_cycle_start_day ?? 1;
    const { month: curCycleMonth, year: curCycleYear } = getCurrentCycle(billingDay);
    let prevCycleMonth = curCycleMonth - 1;
    let prevCycleYear = curCycleYear;
    if (prevCycleMonth < 1) { prevCycleMonth = 12; prevCycleYear -= 1; }

    const currentMonthExpenses = validExpenses.filter(exp =>
      isDateInCycle(exp.date, billingDay, curCycleMonth, curCycleYear)
    );
    const prevMonthExpenses = validExpenses.filter(exp =>
      isDateInCycle(exp.date, billingDay, prevCycleMonth, prevCycleYear)
    );

    const currentTotal = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const prevTotal = prevMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const trend = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;

    return { totalAmount, totalCount, categories: categories.size, children: children.size, currentTotal, trend };
  }, [expenses, filteredExpenses]);

  if (isLoading || !user) {
    return <ReportsSkeleton />;
  }

  if (!account) {
    return (
      <div className="container mx-auto p-6">
        <ErrorState
          title="לא נבחר חשבון"
          message="יש לבחור חשבון כדי לצפות בדוחות"
        />
      </div>
    );
  }

  if (expenseError) {
    return (
      <div className="container mx-auto p-6">
        <ErrorState
          title="שגיאה בטעינת נתונים"
          message={expenseError}
          onRetry={refreshData}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 animate-fade-in" dir="rtl">
      <div className="w-full max-w-7xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 lg:space-y-8">
        
        {/* Header Card - matching dashboard DashboardHeader style */}
        <div className="animate-fade-in">
          <Card className="bg-card border border-border/50 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
            <div className="p-4 sm:p-6 md:p-8">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6">
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 sm:p-3 bg-primary/10 rounded-xl border border-primary/20">
                      <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                      דוחות ונתונים
                    </h1>
                  </div>
                  <p className="text-muted-foreground flex items-center gap-2 text-sm sm:text-base">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    סקירה מקיפה של הוצאות המשפחה לפי קטגוריות וילדים
                  </p>
                </div>
                
                <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-xs font-medium text-muted-foreground">תקופה:</span>
                  </div>
                  <ReportsPeriodFilter value={periodFilter} onChange={setPeriodFilter} />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Empty period message */}
        {filteredExpenses.length === 0 && expenses.filter(e => e.status !== 'rejected').length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-center animate-fade-in" dir="rtl">
            <p className="font-medium text-amber-800 dark:text-amber-200">אין נתונים לתקופה זו</p>
            <p className="text-sm text-muted-foreground mt-1">נסה לבחור תקופה אחרת או "כל התקופה" בראש הדף</p>
          </div>
        )}

        {/* Summary Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 animate-fade-in [animation-delay:200ms]">
          
          {/* Total Expenses */}
          <Card className="bg-card border border-blue-200/50 dark:border-blue-800/30 shadow-md hover:shadow-lg overflow-hidden relative transition-shadow duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/10"></div>
            <CardContent className="p-3 sm:p-4 md:p-5 relative z-10">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 bg-blue-100/50 dark:bg-blue-900/30 px-2 py-0.5 sm:py-1 rounded-full">
                  סה"כ הוצאות
                </span>
                <div className="p-1.5 bg-blue-500/20 rounded-full">
                  <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                ₪{overviewStats.totalAmount.toLocaleString()}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 sm:mt-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full"></div>
                <span className="text-xs text-muted-foreground">{overviewStats.totalCount} הוצאות</span>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Trend */}
          <Card className={`bg-card border ${overviewStats.trend <= 0 ? 'border-green-200/50 dark:border-green-800/30' : 'border-red-200/50 dark:border-red-800/30'} shadow-md hover:shadow-lg overflow-hidden relative transition-shadow duration-300`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${overviewStats.trend <= 0 ? 'from-green-500/5 to-emerald-500/10' : 'from-red-500/5 to-orange-500/10'}`}></div>
            <CardContent className="p-3 sm:p-4 md:p-5 relative z-10">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className={`text-xs sm:text-sm font-semibold ${overviewStats.trend <= 0 ? 'text-green-700 dark:text-green-300 bg-green-100/50 dark:bg-green-900/30' : 'text-red-700 dark:text-red-300 bg-red-100/50 dark:bg-red-900/30'} px-2 py-0.5 sm:py-1 rounded-full`}>
                  מגמה חודשית
                </span>
                <div className={`p-1.5 ${overviewStats.trend <= 0 ? 'bg-green-500/20' : 'bg-red-500/20'} rounded-full`}>
                  {overviewStats.trend <= 0 ? (
                    <ArrowDownRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600 dark:text-red-400" />
                  )}
                </div>
              </div>
              <div className={`text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r ${overviewStats.trend <= 0 ? 'from-green-600 to-emerald-600' : 'from-red-600 to-orange-600'} bg-clip-text text-transparent`}>
                {overviewStats.trend === 0 ? '—' : `${overviewStats.trend > 0 ? '+' : ''}${overviewStats.trend.toFixed(0)}%`}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 sm:mt-2">
                <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 ${overviewStats.trend <= 0 ? 'bg-green-500' : 'bg-red-500'} rounded-full`}></div>
                <span className="text-xs text-muted-foreground">לעומת חודש קודם</span>
              </div>
            </CardContent>
          </Card>

          {/* Categories Count */}
          <Card className="bg-card border border-violet-200/50 dark:border-violet-800/30 shadow-md hover:shadow-lg overflow-hidden relative transition-shadow duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-purple-500/10"></div>
            <CardContent className="p-3 sm:p-4 md:p-5 relative z-10">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-xs sm:text-sm font-semibold text-violet-700 dark:text-violet-300 bg-violet-100/50 dark:bg-violet-900/30 px-2 py-0.5 sm:py-1 rounded-full">
                  קטגוריות
                </span>
                <div className="p-1.5 bg-violet-500/20 rounded-full">
                  <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-violet-600 dark:text-violet-400" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                {overviewStats.categories}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 sm:mt-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-violet-500 rounded-full"></div>
                <span className="text-xs text-muted-foreground">קטגוריות פעילות</span>
              </div>
            </CardContent>
          </Card>

          {/* Children Count */}
          <Card className="bg-card border border-amber-200/50 dark:border-amber-800/30 shadow-md hover:shadow-lg overflow-hidden relative transition-shadow duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/10"></div>
            <CardContent className="p-3 sm:p-4 md:p-5 relative z-10">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-xs sm:text-sm font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-900/30 px-2 py-0.5 sm:py-1 rounded-full">
                  ילדים
                </span>
                <div className="p-1.5 bg-amber-500/20 rounded-full">
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                {overviewStats.children}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 sm:mt-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-amber-500 rounded-full"></div>
                <span className="text-xs text-muted-foreground">ילדים עם הוצאות</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="space-y-4 sm:space-y-6 lg:space-y-8" dir="rtl">
          {/* Multi-month Trend Chart */}
          <div className="animate-fade-in [animation-delay:250ms]">
            <MonthlyTrendChart />
          </div>

          {/* Budget Deviation Chart */}
          <div className="animate-fade-in [animation-delay:300ms]">
            <BudgetDeviationChart periodFilter={periodFilter} filteredExpenses={filteredExpenses} />
          </div>

          {/* Food Budget Chart */}
          <div className="animate-fade-in [animation-delay:350ms]">
            <FoodBudgetChart />
          </div>

          {/* Category Expenses Chart */}
          <div className="animate-fade-in [animation-delay:400ms]">
            <CategoryExpensesChart periodFilter={periodFilter} onCategoryClick={handleCategoryClick} billingDay={account?.billing_cycle_start_day ?? 1} />
          </div>

          {/* Children Expenses Chart */}
          <div className="animate-fade-in [animation-delay:600ms]">
            <ChildrenExpensesChart periodFilter={periodFilter} billingDay={account?.billing_cycle_start_day ?? 1} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
