import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useExpense } from '@/contexts/ExpenseContext';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart as PieChartIcon, BarChart3, Users, Wallet, Hash, UserCheck, TrendingUp, Table2 } from 'lucide-react';
import { filterExpensesByPeriod } from '@/utils/reportsPeriodUtils';
import type { PeriodFilter } from '@/utils/reportsPeriodUtils';

interface ChildData {
  name: string;
  value: number;
  count: number;
  color: string;
}

const CHILD_COLORS = [
  '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B9DC3', '#F472B6', '#84CC16',
];

interface ChildrenExpensesChartProps {
  periodFilter: PeriodFilter;
}

export const ChildrenExpensesChart: React.FC<ChildrenExpensesChartProps> = ({ periodFilter }) => {
  const { expenses } = useExpense();

  const childrenData = useMemo(() => {
    const validExpenses = expenses.filter(expense => expense.status !== 'rejected');
    const filtered = filterExpensesByPeriod(validExpenses, periodFilter);
    
    const childMap = new Map<string, { amount: number; count: number }>();
    
    filtered.forEach(expense => {
      const childName = expense.childName || 'כללי';
      const existing = childMap.get(childName) || { amount: 0, count: 0 };
      childMap.set(childName, {
        amount: existing.amount + expense.amount,
        count: existing.count + 1
      });
    });

    const data: ChildData[] = Array.from(childMap.entries()).map(([childName, stats], index) => ({
      name: childName,
      value: Math.round(stats.amount),
      count: stats.count,
      color: CHILD_COLORS[index % CHILD_COLORS.length]
    })).sort((a, b) => b.value - a.value);

    return data;
  }, [expenses, periodFilter]);

  const totalAmount = childrenData.reduce((sum, item) => sum + item.value, 0);
  const totalCount = childrenData.reduce((sum, item) => sum + item.count, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card/95 backdrop-blur-lg border border-border/50 p-3 sm:p-4 rounded-xl shadow-2xl">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }}></div>
            <p className="font-bold text-sm sm:text-base">{data.name}</p>
          </div>
          <div className="space-y-1 text-xs sm:text-sm">
            <p className="text-primary font-semibold">{`₪${data.value.toLocaleString()}`}</p>
            <p className="text-muted-foreground">{`${data.count} הוצאות`}</p>
            <p className="text-muted-foreground">{`${((data.value / totalAmount) * 100).toFixed(1)}% מסה"כ`}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Summary stats grid component
  const SummaryStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
      <div className="text-center p-2.5 sm:p-3.5 bg-gradient-to-br from-cyan-500/10 to-teal-500/10 backdrop-blur-sm rounded-xl border border-cyan-200/30 dark:border-cyan-800/30 hover:border-cyan-400/50 transition-all duration-300 hover:scale-105 group/stat">
        <div className="p-1.5 bg-cyan-500/15 rounded-lg w-fit mx-auto mb-1.5 group-hover/stat:bg-cyan-500/25 transition-colors duration-300">
          <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-600 dark:text-cyan-400" />
        </div>
        <div className="text-base sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">₪{totalAmount.toLocaleString()}</div>
        <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">סה"כ הוצאות</div>
      </div>
      <div className="text-center p-2.5 sm:p-3.5 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 backdrop-blur-sm rounded-xl border border-indigo-200/30 dark:border-indigo-800/30 hover:border-indigo-400/50 transition-all duration-300 hover:scale-105 group/stat">
        <div className="p-1.5 bg-indigo-500/15 rounded-lg w-fit mx-auto mb-1.5 group-hover/stat:bg-indigo-500/25 transition-colors duration-300">
          <Hash className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="text-base sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">{totalCount}</div>
        <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">סה"כ עסקאות</div>
      </div>
      <div className="text-center p-2.5 sm:p-3.5 bg-gradient-to-br from-pink-500/10 to-rose-500/10 backdrop-blur-sm rounded-xl border border-pink-200/30 dark:border-pink-800/30 hover:border-pink-400/50 transition-all duration-300 hover:scale-105 group/stat">
        <div className="p-1.5 bg-pink-500/15 rounded-lg w-fit mx-auto mb-1.5 group-hover/stat:bg-pink-500/25 transition-colors duration-300">
          <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-pink-600 dark:text-pink-400" />
        </div>
        <div className="text-base sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">{childrenData.length}</div>
        <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">ילדים פעילים</div>
      </div>
      <div className="text-center p-2.5 sm:p-3.5 bg-gradient-to-br from-orange-500/10 to-amber-500/10 backdrop-blur-sm rounded-xl border border-orange-200/30 dark:border-orange-800/30 hover:border-orange-400/50 transition-all duration-300 hover:scale-105 group/stat">
        <div className="p-1.5 bg-orange-500/15 rounded-lg w-fit mx-auto mb-1.5 group-hover/stat:bg-orange-500/25 transition-colors duration-300">
          <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-600 dark:text-orange-400" />
        </div>
        <div className="text-base sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
          ₪{totalCount > 0 ? Math.round(totalAmount / totalCount).toLocaleString() : 0}
        </div>
        <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">ממוצע לעסקה</div>
      </div>
    </div>
  );

  // Legend component for pie chart
  const PieLegend = () => (
    <div className="space-y-2 sm:space-y-2.5">
      {childrenData.map((item) => (
        <div key={item.name} className="flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-lg bg-background/50 hover:bg-background/80 border border-border/20 hover:border-border/40 transition-all duration-200 cursor-default">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full flex-shrink-0 shadow-md" style={{ backgroundColor: item.color }}></div>
            <span className="text-xs sm:text-sm font-medium truncate">{item.name}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <span className="text-xs sm:text-sm font-bold text-primary">₪{item.value.toLocaleString()}</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md">
              {((item.value / totalAmount) * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  if (childrenData.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50 shadow-xl">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <div className="p-1.5 sm:p-2 bg-accent/20 rounded-lg">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
            </div>
            הוצאות לפי ילדים
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            חלוקת ההוצאות לפי ילדים
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="text-center py-8 sm:py-12 text-muted-foreground">
            <div className="p-4 bg-muted/30 rounded-full w-fit mx-auto mb-4">
              <Users className="h-10 w-10 sm:h-12 sm:w-12 opacity-50 animate-pulse" />
            </div>
            <p className="text-base sm:text-lg font-semibold">אין נתונים לתקופה זו</p>
            <p className="text-xs sm:text-sm mt-2 text-muted-foreground/70">
              {periodFilter.type !== 'all'
                ? 'נסה לבחור תקופה אחרת או "כל התקופה" בראש הדף'
                : 'הוסף הוצאות (עם שיוך לילד) כדי לראות את החלוקה לפי ילדים'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50 shadow-xl hover:shadow-2xl transition-all duration-500 group overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-primary/10 opacity-60 group-hover:opacity-90 transition-opacity duration-300"></div>
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
      
      <CardHeader className="relative z-10 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="space-y-1 sm:space-y-2">
            <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-accent/20 to-accent/10 rounded-xl border border-accent/20 group-hover:from-accent/30 group-hover:to-accent/20 transition-all duration-300">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
              </div>
              <span className="bg-gradient-to-r from-foreground to-accent bg-clip-text text-transparent font-bold">
                הוצאות לפי ילדים
              </span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              חלוקת ההוצאות לפי ילדים — סה"כ ₪{totalAmount.toLocaleString()} ({totalCount} הוצאות)
            </CardDescription>
          </div>
          
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10 p-4 sm:p-6 space-y-4 sm:space-y-6">
        <Tabs defaultValue="pie" className="space-y-4 sm:space-y-5">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50 backdrop-blur-sm h-10 sm:h-11">
            <TabsTrigger value="pie" className="flex items-center gap-1.5 sm:gap-2 data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all duration-300 text-xs sm:text-sm font-medium">
              <PieChartIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">תרשים עוגה</span>
              <span className="xs:hidden">עוגה</span>
            </TabsTrigger>
            <TabsTrigger value="bar" className="flex items-center gap-1.5 sm:gap-2 data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all duration-300 text-xs sm:text-sm font-medium">
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">תרשים עמודות</span>
              <span className="xs:hidden">עמודות</span>
            </TabsTrigger>
            <TabsTrigger value="table" className="flex items-center gap-1.5 sm:gap-2 data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all duration-300 text-xs sm:text-sm font-medium">
              <Table2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">טבלה</span>
              <span className="xs:hidden">טבלה</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pie" className="space-y-4 sm:space-y-6 animate-fade-in">
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-start">
              {/* Pie Chart */}
              <div className="w-full lg:w-3/5">
                <ResponsiveContainer width="100%" height={280} className="sm:!h-[350px]">
                  <PieChart>
                    <Pie
                      data={childrenData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius="80%"
                      innerRadius="40%"
                      fill="#8884d8"
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={800}
                      animationEasing="ease-out"
                      stroke="none"
                      paddingAngle={2}
                    >
                      {childrenData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} className="hover:opacity-80 transition-opacity duration-200" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="w-full lg:w-2/5">
                <div className="bg-background/30 backdrop-blur-sm rounded-xl border border-border/20 p-3 sm:p-4">
                  <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    פירוט לפי ילדים
                  </h4>
                  <PieLegend />
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <SummaryStats />
          </TabsContent>

          <TabsContent value="bar" className="space-y-4 sm:space-y-6 animate-fade-in">
            <div className="bg-background/20 backdrop-blur-sm rounded-xl border border-border/20 p-2 sm:p-4">
              <ResponsiveContainer width="100%" height={300} className="sm:!h-[400px]">
                <BarChart data={childrenData} margin={{ top: 20, right: 10, left: 10, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `₪${value.toLocaleString()}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="value" 
                    fill="#8884d8"
                    radius={[8, 8, 0, 0]}
                    animationBegin={0}
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    {childrenData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Summary Stats */}
            <SummaryStats />
          </TabsContent>

          <TabsContent value="table" className="space-y-4 sm:space-y-6 animate-fade-in">
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <Table dir="rtl">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right font-semibold">ילד</TableHead>
                    <TableHead className="text-right font-semibold">סכום (₪)</TableHead>
                    <TableHead className="text-right font-semibold">מספר הוצאות</TableHead>
                    <TableHead className="text-right font-semibold">אחוז מסה"כ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {childrenData.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                          {row.name}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold">₪{row.value.toLocaleString()}</TableCell>
                      <TableCell>{row.count}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {totalAmount > 0 ? ((row.value / totalAmount) * 100).toFixed(1) : 0}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <SummaryStats />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
