import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useExpense } from '@/contexts/ExpenseContext';

interface FoodBudgetData {
  name: string;
  תקציב: number;
  הוצא: number;
  תחזית: number;
}

export const FoodBudgetChart: React.FC = () => {
  const { expenses } = useExpense();
  
  const foodBudgetData = useMemo(() => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    // הגדרת תקציב חודשי (לעת עתה קבוע, אפשר לשנות למשתנה)
    const monthlyBudget = 1200;
    
    // סינון הוצאות מזון לחודש הנוכחי
    const currentMonthFoodExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return (
        expenseDate.getMonth() === currentMonth &&
        expenseDate.getFullYear() === currentYear &&
        (expense.category === 'מזון' || expense.category === 'מזונות') &&
        expense.status !== 'rejected'
      );
    });
    
    // סינון הוצאות מזון לחודש קודם
    const previousMonthFoodExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return (
        expenseDate.getMonth() === previousMonth &&
        expenseDate.getFullYear() === previousYear &&
        (expense.category === 'מזון' || expense.category === 'מזונות') &&
        expense.status !== 'rejected'
      );
    });
    
    // חישוב סכום הוצאות
    const currentMonthSpent = currentMonthFoodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const previousMonthSpent = previousMonthFoodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // חישוב תחזית לסוף החודש
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysPassed = currentDate.getDate();
    const averageDaily = currentMonthSpent / daysPassed;
    const forecasted = averageDaily * daysInMonth;
    
    const data: FoodBudgetData[] = [
      {
        name: 'חודש קודם',
        תקציב: monthlyBudget,
        הוצא: previousMonthSpent,
        תחזית: 0
      },
      {
        name: 'חודש נוכחי',
        תקציב: monthlyBudget,
        הוצא: currentMonthSpent,
        תחזית: forecasted
      }
    ];
    
    return data;
  }, [expenses]);
  
  const getBarColor = (spent: number, budget: number, forecast: number) => {
    if (forecast > budget) return '#ef4444'; // אדום - חריגה מהתקציב
    if (spent > budget * 0.8) return '#f59e0b'; // כתום - קרוב לתקציב
    return '#10b981'; // ירוק - בטווח בטוח
  };
  
  const currentMonth = foodBudgetData[1];
  const remainingBudget = currentMonth.תקציב - currentMonth.הוצא;
  const isOverBudget = currentMonth.תחזית > currentMonth.תקציב;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🍕 תקציב מזונות חודשי
        </CardTitle>
        <CardDescription>
          {isOverBudget ? (
            <span className="text-red-600">
              צפוי לחרוג ב-{Math.round(currentMonth.תחזית - currentMonth.תקציב)}₪
            </span>
          ) : (
            <span className="text-green-600">
              נותרו {Math.round(remainingBudget)}₪ מתוך {currentMonth.תקציב}₪
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={foodBudgetData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [`₪${Math.round(Number(value))}`, name]}
                labelFormatter={(label) => label}
              />
              
              {/* תקציב */}
              <Bar dataKey="תקציב" fill="#e5e7eb" name="תקציב" />
              
              {/* הוצא */}
              <Bar dataKey="הוצא" name="הוצא">
                {foodBudgetData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getBarColor(entry.הוצא, entry.תקציב, entry.תחזית)} 
                  />
                ))}
              </Bar>
              
              {/* תחזית */}
              <Bar 
                dataKey="תחזית" 
                fill="#94a3b8" 
                name="תחזית" 
                opacity={0.7}
                stroke="#64748b"
                strokeDasharray="5 5"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="font-semibold">הוצא החודש</div>
            <div className="text-2xl text-blue-600">₪{Math.round(currentMonth.הוצא)}</div>
          </div>
          <div className="text-center">
            <div className="font-semibold">תחזית לסוף החודש</div>
            <div className={`text-2xl ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
              ₪{Math.round(currentMonth.תחזית)}
            </div>
          </div>
          <div className="text-center">
            <div className="font-semibold">% מהתקציב</div>
            <div className={`text-2xl ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
              {Math.round((currentMonth.הוצא / currentMonth.תקציב) * 100)}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};