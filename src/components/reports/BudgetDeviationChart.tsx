import React, { useMemo } from 'react';
import { useAuth } from '@/contexts/auth';
import { useQuery } from '@tanstack/react-query';
import { budgetService } from '@/integrations/supabase/budgetService';
import { Expense } from '@/contexts/expense/types';
import { type PeriodFilter } from '@/utils/reportsPeriodUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Target } from 'lucide-react';

interface BudgetDeviationChartProps {
  periodFilter: PeriodFilter;
  filteredExpenses: Expense[];
}

interface DeviationPoint {
  category: string;
  budget: number;
  actual: number;
  deviation: number;
  pct: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const d: DeviationPoint = payload[0].payload;
    const isOver = d.actual > d.budget;
    return (
      <div className="bg-card/95 backdrop-blur-lg border border-border/50 p-3 rounded-xl shadow-2xl min-w-[180px]" dir="rtl">
        <p className="font-bold text-sm mb-2">{label}</p>
        <p className="text-muted-foreground text-xs">תקציב: ₪{d.budget.toLocaleString()}</p>
        <p className="text-sm font-semibold">בפועל: ₪{d.actual.toLocaleString()}</p>
        <p className={`text-xs mt-1 font-medium ${isOver ? 'text-red-600' : 'text-green-600'}`}>
          {isOver ? 'חריגה: ' : 'נותר: '}₪{Math.abs(d.deviation).toLocaleString()}
          {' '}({d.pct.toFixed(0)}% מהתקציב)
        </p>
      </div>
    );
  }
  return null;
};

const BudgetDeviationChart: React.FC<BudgetDeviationChartProps> = ({ periodFilter, filteredExpenses }) => {
  const { account } = useAuth();

  const now = new Date();
  const month = periodFilter.type === 'month' && periodFilter.month != null ? periodFilter.month : now.getMonth() + 1;
  const year = periodFilter.type === 'month' && periodFilter.year != null ? periodFilter.year : now.getFullYear();

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets-deviation', account?.id, month, year],
    queryFn: () => budgetService.getBudgets(account!, month, year),
    enabled: !!account,
  });

  const deviationData = useMemo((): DeviationPoint[] => {
    if (budgets.length === 0) return [];

    const expensesByCategory: Record<string, number> = {};
    filteredExpenses.forEach(exp => {
      const cat = exp.category || 'אחר';
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + exp.amount;
    });

    const points: DeviationPoint[] = budgets.map(b => {
      const cats = b.categories && b.categories.length > 0
        ? b.categories
        : b.category ? [b.category] : [];

      if (cats.length === 0) return null;

      const actual = cats.reduce((sum, cat) => sum + (expensesByCategory[cat] || 0), 0);
      const label = cats.length > 1 ? cats.slice(0, 2).join(' + ') + (cats.length > 2 ? '...' : '') : cats[0];
      const deviation = b.monthly_amount - actual;
      const pct = b.monthly_amount > 0 ? (actual / b.monthly_amount) * 100 : 0;

      return { category: label, budget: b.monthly_amount, actual, deviation, pct };
    }).filter((p): p is DeviationPoint => p !== null);

    return points.sort((x, y) => (y.actual / y.budget) - (x.actual / x.budget));
  }, [budgets, filteredExpenses]);

  const periodLabel = periodFilter.type === 'month' && periodFilter.month != null && periodFilter.year != null
    ? `${String(periodFilter.month).padStart(2, '0')}/${periodFilter.year}`
    : `${String(month).padStart(2, '0')}/${year}`;

  if (deviationData.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50 shadow-xl">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
            <div className="p-1.5 sm:p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl border border-primary/20">
              <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <span className="bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent font-bold">
              חריגה מתקציב — {periodLabel}
            </span>
          </CardTitle>
          <CardDescription>אין תקציבים מוגדרים לתקופה זו — הגדר תקציבים בדף ההוצאות</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50 shadow-xl hover:shadow-2xl transition-all duration-500 group overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/10 opacity-60 group-hover:opacity-90 transition-opacity duration-300 pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />

      <CardHeader className="relative z-10 p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
          <div className="p-1.5 sm:p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl border border-primary/20">
            <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <span className="bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent font-bold">
            חריגה מתקציב — {periodLabel}
          </span>
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          השוואה בין תקציב מתוכנן לבין הוצאה בפועל לפי קטגוריה
        </CardDescription>
      </CardHeader>

      <CardContent className="relative z-10 p-4 sm:p-6 pt-0">
        <ResponsiveContainer width="100%" height={Math.max(180, deviationData.length * 52)} className="sm:!min-h-[200px]">
          <BarChart
            data={deviationData}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-15" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="category"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              width={100}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="budget" name="תקציב" fill="hsl(var(--muted-foreground))" fillOpacity={0.25} radius={[0, 4, 4, 0]} />
            <Bar dataKey="actual" name="בפועל" radius={[0, 4, 4, 0]}>
              {deviationData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.actual > entry.budget ? 'hsl(var(--destructive))' : 'hsl(142, 76%, 36%)'}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-muted-foreground/25" />
            תקציב
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(142, 76%, 36%)', opacity: 0.85 }} />
            בגבול התקציב
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-destructive/85" />
            חריגה
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default BudgetDeviationChart;
