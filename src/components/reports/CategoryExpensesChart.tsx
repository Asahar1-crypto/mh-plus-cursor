import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useExpense } from '@/contexts/ExpenseContext';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart as PieChartIcon, BarChart3, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface CategoryData {
  name: string;
  value: number;
  count: number;
  color: string;
}

const CATEGORY_COLORS = {
  'מזון': '#8B5CF6',
  'מזונות': '#8B5CF6', 
  'ביגוד': '#06B6D4',
  'פנאי': '#10B981',
  'קייטנות': '#F59E0B',
  'אחר': '#6B7280'
};

export const CategoryExpensesChart: React.FC = () => {
  const { expenses } = useExpense();
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

  const categoryData = useMemo(() => {
    // Filter out rejected expenses and group by category
    let validExpenses = expenses.filter(expense => expense.status !== 'rejected');
    
    // Filter by selected month if not "all"
    if (selectedMonth !== 'all') {
      const [year, month] = selectedMonth.split('-').map(Number);
      validExpenses = validExpenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getFullYear() === year && expenseDate.getMonth() + 1 === month;
      });
    }
    
    const categoryMap = new Map<string, { amount: number; count: number }>();
    
    validExpenses.forEach(expense => {
      const category = expense.category || 'אחר';
      const existing = categoryMap.get(category) || { amount: 0, count: 0 };
      categoryMap.set(category, {
        amount: existing.amount + expense.amount,
        count: existing.count + 1
      });
    });

    // Convert to array format for charts
    const data: CategoryData[] = Array.from(categoryMap.entries()).map(([category, stats]) => ({
      name: category,
      value: Math.round(stats.amount),
      count: stats.count,
      color: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS['אחר']
    })).sort((a, b) => b.value - a.value); // Sort by amount descending

    return data;
  }, [expenses, selectedMonth]);

  const totalAmount = categoryData.reduce((sum, item) => sum + item.value, 0);
  const totalCount = categoryData.reduce((sum, item) => sum + item.count, 0);

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

  if (categoryData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            הוצאות לפי קטגוריה
          </CardTitle>
          <CardDescription>
            חלוקת ההוצאות לפי קטגוריות שונות
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <PieChartIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">אין נתוני הוצאות להצגה</p>
            <p className="text-sm">הוסף הוצאות כדי לראות את החלוקה לפי קטגוריות</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              הוצאות לפי קטגוריה
            </CardTitle>
            <CardDescription>
              חלוקת ההוצאות לפי קטגוריות שונות - סה"כ ₪{totalAmount.toLocaleString()} ({totalCount} הוצאות)
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="בחר חודש" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pie" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pie" className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              תרשים עוגה
            </TabsTrigger>
            <TabsTrigger value="bar" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              תרשים עמודות
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pie" className="space-y-4">
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="bar" className="space-y-4">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={categoryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `₪${value.toLocaleString()}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  fill="#8884d8"
                  radius={[4, 4, 0, 0]}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Bar Chart Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">₪{totalAmount.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">סה"כ הוצאות</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{totalCount}</div>
                <div className="text-sm text-muted-foreground">סה"כ עסקאות</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{categoryData.length}</div>
                <div className="text-sm text-muted-foreground">קטגוריות פעילות</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">₪{Math.round(totalAmount / totalCount).toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">ממוצע לעסקה</div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};