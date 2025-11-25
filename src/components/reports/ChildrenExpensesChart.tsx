import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useExpense } from '@/contexts/ExpenseContext';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart as PieChartIcon, BarChart3, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface ChildData {
  name: string;
  value: number;
  count: number;
  color: string;
}

const CHILD_COLORS = [
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B9DC3', // Blue Gray
  '#F472B6', // Pink
  '#84CC16', // Lime
];

export const ChildrenExpensesChart: React.FC = () => {
  const { expenses, childrenList } = useExpense();
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Generate month options for the last 12 months
  const monthOptions = useMemo(() => {
    const options = [{ value: 'all', label: 'כל החודשים' }];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = format(date, 'MMMM yyyy', { locale: he });
      options.push({ value, label });
    }
    
    return options;
  }, []);

  const childrenData = useMemo(() => {
    // Filter out rejected expenses and group by child
    let validExpenses = expenses.filter(expense => expense.status !== 'rejected');
    
    // Filter by selected month if not "all"
    if (selectedMonth !== 'all') {
      const [year, month] = selectedMonth.split('-').map(Number);
      validExpenses = validExpenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getFullYear() === year && expenseDate.getMonth() + 1 === month;
      });
    }
    
    const childMap = new Map<string, { amount: number; count: number }>();
    
    validExpenses.forEach(expense => {
      const childName = expense.childName || 'ללא ילד';
      const existing = childMap.get(childName) || { amount: 0, count: 0 };
      childMap.set(childName, {
        amount: existing.amount + expense.amount,
        count: existing.count + 1
      });
    });

    // Convert to array format for charts
    const data: ChildData[] = Array.from(childMap.entries()).map(([childName, stats], index) => ({
      name: childName,
      value: Math.round(stats.amount),
      count: stats.count,
      color: CHILD_COLORS[index % CHILD_COLORS.length]
    })).sort((a, b) => b.value - a.value); // Sort by amount descending

    return data;
  }, [expenses, selectedMonth]);

  const totalAmount = childrenData.reduce((sum, item) => sum + item.value, 0);
  const totalCount = childrenData.reduce((sum, item) => sum + item.count, 0);

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border p-3 rounded-lg shadow-lg">
          <p className="font-semibold">{`${data.name}`}</p>
          <p className="text-primary">{`סכום: ₪${data.value.toLocaleString()}`}</p>
          <p className="text-muted-foreground">{`כמות הוצאות: ${data.count}`}</p>
          <p className="text-muted-foreground">{`${((data.value / totalAmount) * 100).toFixed(1)}% מסה"כ`}</p>
        </div>
      );
    }
    return null;
  };

  if (childrenData.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50 shadow-xl animate-fade-in">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            הוצאות לפי ילדים
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            חלוקת ההוצאות לפי ילדים
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="text-center py-8 sm:py-12 text-muted-foreground animate-scale-in">
            <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50 animate-pulse" />
            <p className="text-base sm:text-lg font-semibold">אין נתוני הוצאות להצגה</p>
            <p className="text-xs sm:text-sm mt-2">הוסף הוצאות כדי לראות את החלוקה לפי ילדים</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50 shadow-xl hover:shadow-2xl transition-all duration-500 group overflow-hidden animate-scale-in">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-primary/10 opacity-60 group-hover:opacity-90 transition-opacity duration-300"></div>
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
      
      <CardHeader className="relative z-10 p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl bg-gradient-to-r from-foreground to-accent bg-clip-text text-transparent">
                <div className="p-1.5 sm:p-2 bg-accent/20 rounded-lg group-hover:bg-accent/30 transition-colors duration-300">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-accent animate-pulse group-hover:animate-bounce transition-all duration-300" />
                </div>
                הוצאות לפי ילדים
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1 sm:mt-2">
                חלוקת ההוצאות לפי ילדים - סה"כ ₪{totalAmount.toLocaleString()} ({totalCount} הוצאות)
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full xs:w-40 sm:w-[180px] h-9 sm:h-10 text-xs sm:text-sm bg-background/80 border-border/50 hover:bg-background hover:border-accent/50 transition-all duration-300">
                  <SelectValue placeholder="בחר חודש" />
                </SelectTrigger>
                <SelectContent className="bg-background/95 backdrop-blur-lg border border-border/50">
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-xs sm:text-sm">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10 p-4 sm:p-6">
        <Tabs defaultValue="pie" className="space-y-3 sm:space-y-4">
          <TabsList className="grid w-full grid-cols-2 bg-muted/50 backdrop-blur-sm">
            <TabsTrigger value="pie" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all duration-300 text-xs sm:text-sm">
              <PieChartIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">תרשים עוגה</span>
              <span className="xs:hidden">עוגה</span>
            </TabsTrigger>
            <TabsTrigger value="bar" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all duration-300 text-xs sm:text-sm">
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">תרשים עמודות</span>
              <span className="xs:hidden">עמודות</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pie" className="space-y-3 sm:space-y-4 animate-fade-in">
            <ResponsiveContainer width="100%" height={300} className="sm:!h-[400px]">
              <PieChart>
                <Pie
                  data={childrenData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  className="sm:!r-[120]"
                  animationBegin={0}
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  {childrenData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="bar" className="space-y-3 sm:space-y-4 animate-fade-in">
            <ResponsiveContainer width="100%" height={300} className="sm:!h-[400px]">
              <BarChart data={childrenData} margin={{ top: 20, right: 10, left: 10, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  className="sm:text-xs"
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => `₪${value.toLocaleString()}`}
                  className="sm:text-xs"
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  fill="#8884d8"
                  radius={[4, 4, 0, 0]}
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

            {/* Bar Chart Summary Stats with animations */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mt-4 sm:mt-6">
              <div className="text-center p-2 sm:p-3 bg-gradient-to-br from-muted/80 to-muted/50 backdrop-blur-sm rounded-lg border border-border/30 hover:border-accent/30 transition-all duration-300 animate-scale-in">
                <div className="text-lg sm:text-2xl font-bold text-accent">₪{totalAmount.toLocaleString()}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">סה"כ הוצאות</div>
              </div>
              <div className="text-center p-2 sm:p-3 bg-gradient-to-br from-muted/80 to-muted/50 backdrop-blur-sm rounded-lg border border-border/30 hover:border-accent/30 transition-all duration-300 animate-scale-in [animation-delay:100ms]">
                <div className="text-lg sm:text-2xl font-bold text-accent">{totalCount}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">סה"כ עסקאות</div>
              </div>
              <div className="text-center p-2 sm:p-3 bg-gradient-to-br from-muted/80 to-muted/50 backdrop-blur-sm rounded-lg border border-border/30 hover:border-accent/30 transition-all duration-300 animate-scale-in [animation-delay:200ms]">
                <div className="text-lg sm:text-2xl font-bold text-accent">{childrenData.length}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">ילדים פעילים</div>
              </div>
              <div className="text-center p-2 sm:p-3 bg-gradient-to-br from-muted/80 to-muted/50 backdrop-blur-sm rounded-lg border border-border/30 hover:border-accent/30 transition-all duration-300 animate-scale-in [animation-delay:300ms]">
                <div className="text-lg sm:text-2xl font-bold text-accent">₪{Math.round(totalAmount / totalCount).toLocaleString()}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">ממוצע לעסקה</div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};