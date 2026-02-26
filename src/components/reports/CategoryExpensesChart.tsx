import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useExpense } from '@/contexts/ExpenseContext';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart as PieChartIcon, BarChart3, Wallet, Hash, Layers, TrendingUp, Table2 } from 'lucide-react';
import { filterExpensesByPeriod } from '@/utils/reportsPeriodUtils';
import type { PeriodFilter } from '@/utils/reportsPeriodUtils';

interface CategoryData {
  name: string;
  value: number;
  count: number;
  color: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  'מזון': '#8B5CF6',
  'מזונות': '#8B5CF6', 
  'ביגוד': '#06B6D4',
  'פנאי': '#10B981',
  'קייטנות': '#F59E0B',
  'חינוך': '#3B82F6',
  'רפואה': '#EC4899',
  'אחר': '#6B7280'
};

const CHART_COLORS = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#6B7280'];

function getCategoryColor(category: string, index: number): string {
  return CATEGORY_COLORS[category] || CHART_COLORS[index % CHART_COLORS.length];
}

interface CategoryExpensesChartProps {
  periodFilter: PeriodFilter;
  onCategoryClick?: (category: string) => void;
}

export const CategoryExpensesChart: React.FC<CategoryExpensesChartProps> = ({ periodFilter, onCategoryClick }) => {
  const { expenses } = useExpense();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categoryData = useMemo(() => {
    const validExpenses = expenses.filter(expense => expense.status !== 'rejected');
    const filtered = filterExpensesByPeriod(validExpenses, periodFilter);
    
    const categoryMap = new Map<string, { amount: number; count: number }>();
    
    filtered.forEach(expense => {
      const category = expense.category || 'אחר';
      const existing = categoryMap.get(category) || { amount: 0, count: 0 };
      categoryMap.set(category, {
        amount: existing.amount + expense.amount,
        count: existing.count + 1
      });
    });

    const data: CategoryData[] = Array.from(categoryMap.entries()).map(([category, stats], idx) => ({
      name: category,
      value: Math.round(stats.amount),
      count: stats.count,
      color: getCategoryColor(category, idx)
    })).sort((a, b) => b.value - a.value);

    return data;
  }, [expenses, periodFilter]);

  const totalAmount = categoryData.reduce((sum, item) => sum + item.value, 0);
  const totalCount = categoryData.reduce((sum, item) => sum + item.count, 0);

  // Previous period for comparison in tooltips
  const prevCategoryMap = useMemo(() => {
    let prevFilter: PeriodFilter | null = null;
    if (periodFilter.type === 'month' && periodFilter.month && periodFilter.year) {
      const prevMonth = periodFilter.month === 1 ? 12 : periodFilter.month - 1;
      const prevYear = periodFilter.month === 1 ? periodFilter.year - 1 : periodFilter.year;
      prevFilter = { type: 'month', month: prevMonth, year: prevYear };
    } else if (periodFilter.type === 'year' && periodFilter.year) {
      prevFilter = { type: 'year', year: periodFilter.year - 1 };
    } else if (periodFilter.type === 'quarter' && periodFilter.quarter && periodFilter.year) {
      const prevQ = periodFilter.quarter === 1 ? 4 : periodFilter.quarter - 1;
      const prevY = periodFilter.quarter === 1 ? periodFilter.year - 1 : periodFilter.year;
      prevFilter = { type: 'quarter', quarter: prevQ, year: prevY };
    }
    if (!prevFilter) return null;
    const valid = expenses.filter(e => e.status !== 'rejected');
    const prevFiltered = filterExpensesByPeriod(valid, prevFilter);
    const map = new Map<string, number>();
    prevFiltered.forEach(e => {
      const cat = e.category || 'אחר';
      map.set(cat, (map.get(cat) || 0) + e.amount);
    });
    return map;
  }, [expenses, periodFilter]);

  const handleClick = (category: string) => {
    setActiveCategory(prev => prev === category ? null : category);
    onCategoryClick?.(category);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const prevAmount = prevCategoryMap?.get(data.name) ?? null;
      const change = prevAmount !== null && prevAmount > 0
        ? ((data.value - prevAmount) / prevAmount) * 100
        : null;
      const isNew = prevCategoryMap !== null && prevAmount === 0;
      return (
        <div className="bg-card/95 backdrop-blur-lg border border-border/50 p-3 sm:p-4 rounded-xl shadow-2xl min-w-[160px]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: data.color }}></div>
            <p className="font-bold text-sm sm:text-base">{data.name}</p>
          </div>
          <div className="space-y-1 text-xs sm:text-sm">
            <p className="text-primary font-semibold">{`₪${data.value.toLocaleString()}`}</p>
            <p className="text-muted-foreground">{`${data.count} הוצאות`}</p>
            <p className="text-muted-foreground">{`${((data.value / totalAmount) * 100).toFixed(1)}% מסה"כ`}</p>
            {change !== null && (
              <p className={`font-medium ${change >= 0 ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'}`}>
                {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(0)}% מתקופה קודמת
              </p>
            )}
            {isNew && (
              <p className="text-amber-500 font-medium">חדש בתקופה זו</p>
            )}
            {onCategoryClick && (
              <p className="text-muted-foreground/60 text-[10px] pt-1 border-t border-border/30 mt-1">לחץ לסינון הוצאות</p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Summary stats grid component
  const SummaryStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
      <div className="text-center p-2.5 sm:p-3.5 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-sm rounded-xl border border-blue-200/30 dark:border-blue-800/30 hover:border-blue-400/50 transition-all duration-300 hover:scale-105 group/stat">
        <div className="p-1.5 bg-blue-500/15 rounded-lg w-fit mx-auto mb-1.5 group-hover/stat:bg-blue-500/25 transition-colors duration-300">
          <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="text-base sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">₪{totalAmount.toLocaleString()}</div>
        <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">סה"כ הוצאות</div>
      </div>
      <div className="text-center p-2.5 sm:p-3.5 bg-gradient-to-br from-violet-500/10 to-purple-500/10 backdrop-blur-sm rounded-xl border border-violet-200/30 dark:border-violet-800/30 hover:border-violet-400/50 transition-all duration-300 hover:scale-105 group/stat">
        <div className="p-1.5 bg-violet-500/15 rounded-lg w-fit mx-auto mb-1.5 group-hover/stat:bg-violet-500/25 transition-colors duration-300">
          <Hash className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="text-base sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">{totalCount}</div>
        <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">סה"כ עסקאות</div>
      </div>
      <div className="text-center p-2.5 sm:p-3.5 bg-gradient-to-br from-emerald-500/10 to-green-500/10 backdrop-blur-sm rounded-xl border border-emerald-200/30 dark:border-emerald-800/30 hover:border-emerald-400/50 transition-all duration-300 hover:scale-105 group/stat">
        <div className="p-1.5 bg-emerald-500/15 rounded-lg w-fit mx-auto mb-1.5 group-hover/stat:bg-emerald-500/25 transition-colors duration-300">
          <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="text-base sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">{categoryData.length}</div>
        <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">קטגוריות פעילות</div>
      </div>
      <div className="text-center p-2.5 sm:p-3.5 bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-sm rounded-xl border border-amber-200/30 dark:border-amber-800/30 hover:border-amber-400/50 transition-all duration-300 hover:scale-105 group/stat">
        <div className="p-1.5 bg-amber-500/15 rounded-lg w-fit mx-auto mb-1.5 group-hover/stat:bg-amber-500/25 transition-colors duration-300">
          <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="text-base sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
          ₪{totalCount > 0 ? Math.round(totalAmount / totalCount).toLocaleString() : 0}
        </div>
        <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">ממוצע לעסקה</div>
      </div>
    </div>
  );

  // Legend component for pie chart
  const PieLegend = () => (
    <div className="space-y-2 sm:space-y-2.5">
      {categoryData.map((item) => (
        <div
          key={item.name}
          onClick={() => handleClick(item.name)}
          className={`flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-lg border transition-all duration-200 group/legend cursor-pointer
            ${activeCategory === item.name
              ? 'bg-primary/10 border-primary/40'
              : activeCategory
                ? 'bg-background/30 border-border/10 opacity-50 hover:opacity-80 hover:bg-background/50'
                : 'bg-background/50 hover:bg-background/80 border-border/20 hover:border-border/40'
            }`}
        >
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

  if (categoryData.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50 shadow-xl">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <div className="p-1.5 sm:p-2 bg-primary/20 rounded-lg">
              <PieChartIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            הוצאות לפי קטגוריה
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            חלוקת ההוצאות לפי קטגוריות שונות
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="text-center py-8 sm:py-12 text-muted-foreground">
            <div className="p-4 bg-muted/30 rounded-full w-fit mx-auto mb-4">
              <PieChartIcon className="h-10 w-10 sm:h-12 sm:w-12 opacity-50 animate-pulse" />
            </div>
            <p className="text-base sm:text-lg font-semibold">אין נתונים לתקופה זו</p>
            <p className="text-xs sm:text-sm mt-2 text-muted-foreground/70">
              {periodFilter.type !== 'all'
                ? 'נסה לבחור תקופה אחרת או "כל התקופה" בראש הדף'
                : 'הוסף הוצאות כדי לראות את החלוקה לפי קטגוריות'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50 shadow-xl hover:shadow-2xl transition-all duration-500 group overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/10 opacity-60 group-hover:opacity-90 transition-opacity duration-300"></div>
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-accent/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
      
      <CardHeader className="relative z-10 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="space-y-1 sm:space-y-2">
            <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl border border-primary/20 group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-300">
                <PieChartIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <span className="bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent font-bold">
                הוצאות לפי קטגוריה
              </span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              חלוקת ההוצאות לפי קטגוריות שונות — סה"כ ₪{totalAmount.toLocaleString()} ({totalCount} הוצאות)
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
            {activeCategory && (
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/30 rounded-lg text-sm">
                <span className="font-medium text-primary">מסנן: {activeCategory}</span>
                <button onClick={() => setActiveCategory(null)} className="mr-auto text-xs text-muted-foreground hover:text-foreground underline">נקה</button>
              </div>
            )}
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-start">
              {/* Pie Chart */}
              <div className="w-full lg:w-3/5">
                <ResponsiveContainer width="100%" height={280} className="sm:!h-[350px]">
                  <PieChart>
                    <Pie
                      data={categoryData}
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
                      onClick={(data) => handleClick(data.name)}
                      style={{ cursor: 'pointer' }}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          opacity={activeCategory && activeCategory !== entry.name ? 0.35 : 1}
                          className="transition-opacity duration-200"
                        />
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
                    <Layers className="h-3.5 w-3.5" />
                    פירוט קטגוריות
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
                <BarChart data={categoryData} margin={{ top: 20, right: 10, left: 10, bottom: 60 }}>
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
                    onClick={(data) => handleClick(data.name)}
                    style={{ cursor: 'pointer' }}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        opacity={activeCategory && activeCategory !== entry.name ? 0.35 : 1}
                      />
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
                    <TableHead className="text-right font-semibold">קטגוריה</TableHead>
                    <TableHead className="text-right font-semibold">סכום (₪)</TableHead>
                    <TableHead className="text-right font-semibold">מספר הוצאות</TableHead>
                    <TableHead className="text-right font-semibold">אחוז מסה"כ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryData.map((row) => (
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
