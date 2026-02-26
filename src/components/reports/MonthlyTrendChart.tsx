import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useExpense } from '@/contexts/ExpenseContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const MONTHS_TO_SHOW = 6;

interface MonthPoint {
  label: string;
  amount: number;
  count: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const d: MonthPoint = payload[0].payload;
    return (
      <div className="bg-card/95 backdrop-blur-lg border border-border/50 p-3 rounded-xl shadow-2xl min-w-[140px]" dir="rtl">
        <p className="font-bold text-sm mb-1.5">{label}</p>
        <p className="text-primary font-semibold text-base">₪{d.amount.toLocaleString()}</p>
        <p className="text-muted-foreground text-xs mt-0.5">{d.count} הוצאות</p>
      </div>
    );
  }
  return null;
};

export const MonthlyTrendChart: React.FC = () => {
  const { expenses } = useExpense();

  const trendData = useMemo((): MonthPoint[] => {
    const now = new Date();
    return Array.from({ length: MONTHS_TO_SHOW }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (MONTHS_TO_SHOW - 1 - i), 1);
      const month = d.getMonth();
      const year = d.getFullYear();
      const monthExpenses = expenses.filter(exp => {
        if (exp.status === 'rejected') return false;
        const expDate = new Date(exp.date);
        return expDate.getMonth() === month && expDate.getFullYear() === year;
      });
      return {
        label: format(d, 'MMM yy', { locale: he }),
        amount: Math.round(monthExpenses.reduce((sum, e) => sum + e.amount, 0)),
        count: monthExpenses.length,
      };
    });
  }, [expenses]);

  const avgAmount = trendData.length > 0
    ? Math.round(trendData.reduce((s, d) => s + d.amount, 0) / trendData.length)
    : 0;

  const lastTwo = trendData.slice(-2);
  const trend = lastTwo.length === 2 && lastTwo[0].amount > 0
    ? ((lastTwo[1].amount - lastTwo[0].amount) / lastTwo[0].amount) * 100
    : null;

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50 shadow-xl hover:shadow-2xl transition-all duration-500 group overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/10 opacity-60 group-hover:opacity-90 transition-opacity duration-300 pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />

      <CardHeader className="relative z-10 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl border border-primary/20">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <span className="bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent font-bold">
                מגמת הוצאות — {MONTHS_TO_SHOW} חודשים אחרונים
              </span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              סך ההוצאות החודשי על ציר הזמן • ממוצע: ₪{avgAmount.toLocaleString()}
            </CardDescription>
          </div>

          {trend !== null && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 ${
              trend <= 0
                ? 'bg-green-100/80 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'bg-red-100/80 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            }`}>
              {trend <= 0
                ? <TrendingDown className="h-3.5 w-3.5" />
                : <TrendingUp className="h-3.5 w-3.5" />}
              {trend > 0 ? '+' : ''}{trend.toFixed(0)}% מחודש קודם
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="relative z-10 p-4 sm:p-6 pt-0">
        <ResponsiveContainer width="100%" height={220} className="sm:!h-[260px]">
          <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="opacity-15" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`}
              width={52}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={avgAmount}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
              label={{ value: 'ממוצע', position: 'insideTopRight', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              fill="url(#trendGradient)"
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
              animationBegin={0}
              animationDuration={900}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
