import React, { useMemo } from 'react';
import { useAuth } from '@/contexts/auth';
import { useExpense } from '@/contexts/ExpenseContext';
import { useQuery } from '@tanstack/react-query';
import { budgetService } from '@/integrations/supabase/budgetService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { format, subMonths } from 'date-fns';
import { he } from 'date-fns/locale';
import { isDateInCycle, getCycleDayInfo, getCycleLabelHebrew, getCurrentCycle } from '@/utils/billingCycleUtils';

interface BudgetData {
  month: string;
  budget: number;
  spent: number;
  projection: number;
  difference: number;
}

const FOOD_CATEGORIES = ['מזון', 'מזונות'];

const FoodBudgetChart = () => {
  const { account } = useAuth();
  const { expenses } = useExpense();
  const billingDay = account?.billing_cycle_start_day ?? 1;
  const { month: currentMonth, year: currentYear } = getCurrentCycle(billingDay);
  let lastMonthNum = currentMonth - 1;
  let lastMonthYear = currentYear;
  if (lastMonthNum < 1) { lastMonthNum = 12; lastMonthYear -= 1; }

  const { data: currentBudgets = [] } = useQuery({
    queryKey: ['budgets', account?.id, currentMonth, currentYear],
    queryFn: () => budgetService.getBudgets(account!, currentMonth, currentYear),
    enabled: !!account?.id,
  });

  const { data: lastBudgets = [] } = useQuery({
    queryKey: ['budgets', account?.id, lastMonthNum, lastMonthYear],
    queryFn: () => budgetService.getBudgets(account!, lastMonthNum, lastMonthYear),
    enabled: !!account?.id,
  });

  const data = useMemo(() => {
    const foodFilter = (b: { category?: string | null; categories?: string[] | null }) => {
      if (b.categories?.length) return b.categories.some(c => FOOD_CATEGORIES.includes(c));
      return b.category && FOOD_CATEGORIES.includes(b.category);
    };
    const currentBudget = currentBudgets
      .filter(foodFilter)
      .reduce((sum, b) => sum + b.monthly_amount, 0) || 3000;
    const lastBudget = lastBudgets
      .filter(foodFilter)
      .reduce((sum, b) => sum + b.monthly_amount, 0) || 3000;

    const currentMonthExpenses = expenses.filter(exp =>
      isDateInCycle(exp.date, billingDay, currentMonth, currentYear) &&
      FOOD_CATEGORIES.includes(exp.category) && exp.status !== 'rejected'
    );
    const lastMonthExpenses = expenses.filter(exp =>
      isDateInCycle(exp.date, billingDay, lastMonthNum, lastMonthYear) &&
      FOOD_CATEGORIES.includes(exp.category) && exp.status !== 'rejected'
    );

    const currentSpent = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const lastSpent = lastMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    const { totalDays, daysPassed } = getCycleDayInfo(billingDay, currentMonth, currentYear);
    const safeDaysPassed = Math.max(1, daysPassed);
    const currentProjection = (currentSpent / safeDaysPassed) * totalDays;

    return [
      {
        month: getCycleLabelHebrew(billingDay, lastMonthNum, lastMonthYear),
        budget: lastBudget,
        spent: lastSpent,
        projection: lastSpent,
        difference: lastBudget - lastSpent
      },
      {
        month: getCycleLabelHebrew(billingDay, currentMonth, currentYear),
        budget: currentBudget,
        spent: currentSpent,
        projection: currentProjection,
        difference: currentBudget - currentProjection
      }
    ] as BudgetData[];
  }, [expenses, currentBudgets, lastBudgets, billingDay, currentMonth, currentYear, lastMonthNum, lastMonthYear]);

  const chartConfig = {
    budget: {
      label: "תקציב",
      color: "hsl(var(--primary))",
    },
    spent: {
      label: "הוצא",
      color: "hsl(var(--destructive))",
    },
    projection: {
      label: "תחזית",
      color: "hsl(var(--warning))",
    },
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.length > 0 && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">תקציב חודשי</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₪{data[1]?.budget.toLocaleString()}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">הוצא עד כה</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₪{data[1]?.spent.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {data[1]?.budget > 0 ? Math.round((data[1]?.spent / data[1]?.budget) * 100) : 0}% מהתקציב
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">תחזית לסוף החודש</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₪{data[1]?.projection.toLocaleString()}</div>
                <p className={`text-xs ${data[1]?.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data[1]?.difference >= 0 ? 'חיסכון' : 'חריגה'}: ₪{Math.abs(data[1]?.difference || 0).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>השוואה חודשית</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `₪${value.toLocaleString()}`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="budget" fill="var(--color-budget)" name="תקציב" />
                <Bar dataKey="spent" fill="var(--color-spent)" name="הוצא" />
                <Bar dataKey="projection" fill="var(--color-projection)" name="תחזית" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default FoodBudgetChart;