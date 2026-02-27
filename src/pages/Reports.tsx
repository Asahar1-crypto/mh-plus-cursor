import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { useExpense } from '@/contexts/ExpenseContext';
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

const Reports = () => {
  const navigate = useNavigate();
  const { user, account, isLoading } = useAuth();
  const { expenses } = useExpense();
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
    return filterExpensesByPeriod(valid, periodFilter);
  }, [expenses, periodFilter]);

  // Calculate overview stats based on filtered period
  const overviewStats = useMemo(() => {
    const validExpenses = expenses.filter(exp => exp.status !== 'rejected');
    const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalCount = filteredExpenses.length;

    // Get unique categories and children from filtered data
    const categories = new Set(filteredExpenses.map(exp => exp.category || 'אחר'));
    const children = new Set(filteredExpenses.map(exp => exp.childName).filter(Boolean));

    // Current month vs previous month comparison (from all valid expenses)
    const now = new Date();
    const currentMonthExpenses = validExpenses.filter(exp => {
      const d = new Date(exp.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const prevMonthExpenses = validExpenses.filter(exp => {
      const d = new Date(exp.date);
      const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    });

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
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">לא נבחר חשבון</h2>
          <p className="text-muted-foreground">יש לבחור חשבון כדי לצפות בדוחות</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 animate-fade-in" dir="rtl">
      <div className="w-full max-w-7xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 lg:space-y-8">
        
        {/* Header Card - matching dashboard DashboardHeader style */}
        <div className="animate-fade-in">
          <Card className="bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50 shadow-xl hover:shadow-2xl transition-all duration-500 group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
            
            <div className="p-4 sm:p-6 md:p-8 relative">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6">
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 sm:p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl backdrop-blur-sm border border-primary/20 group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-300">
                      <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                      דוחות ונתונים
                    </h1>
                  </div>
                  <p className="text-muted-foreground flex items-center gap-2 text-sm sm:text-base hover:text-foreground transition-colors duration-300">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary animate-pulse" />
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
          <Card className="bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50 shadow-xl hover:shadow-2xl overflow-hidden relative group hover:scale-105 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/15 opacity-60 group-hover:opacity-90 transition-opacity duration-300"></div>
            <div className="absolute -top-16 -right-16 w-32 h-32 bg-blue-400/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
            <CardContent className="p-3 sm:p-4 md:p-5 relative z-10">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 bg-blue-100/50 dark:bg-blue-900/30 px-2 py-0.5 sm:py-1 rounded-full">
                  סה"כ הוצאות
                </span>
                <div className="p-1.5 bg-blue-500/20 rounded-full group-hover:bg-blue-500/30 transition-colors duration-300">
                  <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300 origin-right">
                ₪{overviewStats.totalAmount.toLocaleString()}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 sm:mt-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-pulse shadow-lg shadow-blue-500/50"></div>
                <span className="text-xs text-muted-foreground">{overviewStats.totalCount} הוצאות</span>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Trend */}
          <Card className="bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50 shadow-xl hover:shadow-2xl overflow-hidden relative group hover:scale-105 transition-all duration-500">
            <div className={`absolute inset-0 bg-gradient-to-br ${overviewStats.trend <= 0 ? 'from-green-500/10 to-emerald-500/15' : 'from-red-500/10 to-orange-500/15'} opacity-60 group-hover:opacity-90 transition-opacity duration-300`}></div>
            <div className={`absolute -top-16 -right-16 w-32 h-32 ${overviewStats.trend <= 0 ? 'bg-green-400/20' : 'bg-red-400/20'} rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700`}></div>
            <CardContent className="p-3 sm:p-4 md:p-5 relative z-10">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className={`text-xs sm:text-sm font-semibold ${overviewStats.trend <= 0 ? 'text-green-700 dark:text-green-300 bg-green-100/50 dark:bg-green-900/30' : 'text-red-700 dark:text-red-300 bg-red-100/50 dark:bg-red-900/30'} px-2 py-0.5 sm:py-1 rounded-full`}>
                  מגמה חודשית
                </span>
                <div className={`p-1.5 ${overviewStats.trend <= 0 ? 'bg-green-500/20' : 'bg-red-500/20'} rounded-full group-hover:${overviewStats.trend <= 0 ? 'bg-green-500/30' : 'bg-red-500/30'} transition-colors duration-300`}>
                  {overviewStats.trend <= 0 ? (
                    <ArrowDownRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600 dark:text-red-400" />
                  )}
                </div>
              </div>
              <div className={`text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r ${overviewStats.trend <= 0 ? 'from-green-600 to-emerald-600' : 'from-red-600 to-orange-600'} bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300 origin-right`}>
                {overviewStats.trend === 0 ? '—' : `${overviewStats.trend > 0 ? '+' : ''}${overviewStats.trend.toFixed(0)}%`}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 sm:mt-2">
                <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 ${overviewStats.trend <= 0 ? 'bg-green-500' : 'bg-red-500'} rounded-full animate-pulse`}></div>
                <span className="text-xs text-muted-foreground">לעומת חודש קודם</span>
              </div>
            </CardContent>
          </Card>

          {/* Categories Count */}
          <Card className="bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50 shadow-xl hover:shadow-2xl overflow-hidden relative group hover:scale-105 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-purple-500/15 opacity-60 group-hover:opacity-90 transition-opacity duration-300"></div>
            <div className="absolute -top-16 -right-16 w-32 h-32 bg-violet-400/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
            <CardContent className="p-3 sm:p-4 md:p-5 relative z-10">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-xs sm:text-sm font-semibold text-violet-700 dark:text-violet-300 bg-violet-100/50 dark:bg-violet-900/30 px-2 py-0.5 sm:py-1 rounded-full">
                  קטגוריות
                </span>
                <div className="p-1.5 bg-violet-500/20 rounded-full group-hover:bg-violet-500/30 transition-colors duration-300">
                  <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-violet-600 dark:text-violet-400" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300 origin-right">
                {overviewStats.categories}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 sm:mt-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-violet-500 rounded-full animate-pulse shadow-lg shadow-violet-500/50"></div>
                <span className="text-xs text-muted-foreground">קטגוריות פעילות</span>
              </div>
            </CardContent>
          </Card>

          {/* Children Count */}
          <Card className="bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50 shadow-xl hover:shadow-2xl overflow-hidden relative group hover:scale-105 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/15 opacity-60 group-hover:opacity-90 transition-opacity duration-300"></div>
            <div className="absolute -top-16 -right-16 w-32 h-32 bg-amber-400/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
            <CardContent className="p-3 sm:p-4 md:p-5 relative z-10">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-xs sm:text-sm font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-900/30 px-2 py-0.5 sm:py-1 rounded-full">
                  ילדים
                </span>
                <div className="p-1.5 bg-amber-500/20 rounded-full group-hover:bg-amber-500/30 transition-colors duration-300">
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300 origin-right">
                {overviewStats.children}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 sm:mt-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-amber-500 rounded-full animate-pulse shadow-lg shadow-amber-500/50"></div>
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
            <CategoryExpensesChart periodFilter={periodFilter} onCategoryClick={handleCategoryClick} />
          </div>

          {/* Children Expenses Chart */}
          <div className="animate-fade-in [animation-delay:600ms]">
            <ChildrenExpensesChart periodFilter={periodFilter} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
