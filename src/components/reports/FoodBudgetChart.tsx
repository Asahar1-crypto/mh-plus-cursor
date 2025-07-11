import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { he } from 'date-fns/locale';

interface BudgetData {
  month: string;
  budget: number;
  spent: number;
  projection: number;
  difference: number;
}

const FoodBudgetChart = () => {
  const { account } = useAuth();
  const [data, setData] = useState<BudgetData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (account?.id) {
      fetchBudgetData();
    }
  }, [account]);

  const fetchBudgetData = async () => {
    if (!account?.id) return;

    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      
      const lastMonth = subMonths(currentDate, 1);
      const lastMonthNum = lastMonth.getMonth() + 1;
      const lastMonthYear = lastMonth.getFullYear();

      // For now, we'll create mock data since the budgets table is new
      // In a real app, you'd fetch from supabase like this:
      // const { data: budgets } = await supabase.from('budgets').select('*')...
      
      // Fetch expenses for current and last month
      const { data: currentExpenses } = await supabase
        .from('expenses')
        .select('amount, date')
        .eq('account_id', account.id)
        .eq('category', 'food')
        .gte('date', format(startOfMonth(currentDate), 'yyyy-MM-dd'))
        .lte('date', format(endOfMonth(currentDate), 'yyyy-MM-dd'));

      const { data: lastExpenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('account_id', account.id)
        .eq('category', 'food')
        .gte('date', format(startOfMonth(lastMonth), 'yyyy-MM-dd'))
        .lte('date', format(endOfMonth(lastMonth), 'yyyy-MM-dd'));

      // Mock budget data - in production, fetch from budgets table
      const currentBudget = 3000; // Default budget
      const lastBudget = 3000;

      const currentSpent = currentExpenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
      const lastSpent = lastExpenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

      // Calculate projection based on current spending rate
      const daysInMonth = endOfMonth(currentDate).getDate();
      const daysPassed = currentDate.getDate();
      const currentProjection = daysPassed > 0 ? (currentSpent / daysPassed) * daysInMonth : 0;

      const chartData: BudgetData[] = [
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
      ];

      setData(chartData);
    } catch (error) {
      console.error('Error fetching budget data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

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