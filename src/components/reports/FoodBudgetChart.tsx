import React, { useMemo } from 'react';
import { useAuth } from '@/contexts/auth';
import { useExpense } from '@/contexts/ExpenseContext';
import { useQuery } from '@tanstack/react-query';
import { budgetService } from '@/integrations/supabase/budgetService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { he } from 'date-fns/locale';

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
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const lastMonth = subMonths(currentDate, 1);
  const lastMonthNum = lastMonth.getMonth() + 1;
  const lastMonthYear = lastMonth.getFullYear();

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

    const currentMonthExpenses = expenses.filter(exp => {
      const d = new Date(exp.date);
      return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentYear &&
        FOOD_CATEGORIES.includes(exp.category) && exp.status !== 'rejected';
    });
    const lastMonthExpenses = expenses.filter(exp => {
      const d = new Date(exp.date);
      return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonthYear &&
        FOOD_CATEGORIES.includes(exp.category) && exp.status !== 'rejected';
    });

    const currentSpent = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const lastSpent = lastMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    const daysInMonth = endOfMonth(currentDate).getDate();
    const daysPassed = Math.max(1, currentDate.getDate());
    const currentProjection = (currentSpent / daysPassed) * daysInMonth;

    return [
      {
        month: format(lastMonth, 'MMMM yyyy', { locale: he }),
        budget: lastBudget,
        spent: lastSpent,
        projection: lastSpent,
        difference: lastBudget - lastSpent
      },
      {
        month: format(currentDate, 'MMMM yyyy', { locale: he }),
        budget: currentBudget,
        spent: currentSpent,
        projection: currentProjection,
        difference: currentBudget - currentProjection
      }
    ] as BudgetData[];
  }, [expenses, currentBudgets, lastBudgets, currentDate, lastMonth, currentYear, lastMonthYear]);

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