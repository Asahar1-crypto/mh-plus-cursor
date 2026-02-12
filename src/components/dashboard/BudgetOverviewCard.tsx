import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth';
import { useExpense } from '@/contexts/ExpenseContext';
import { useQuery } from '@tanstack/react-query';
import { budgetService, Budget } from '@/integrations/supabase/budgetService';
import { Wallet, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

function budgetAppliesToCategory(b: Budget, category: string): boolean {
  if (b.categories && b.categories.length > 0) {
    return b.categories.includes(category);
  }
  return b.category === category;
}

interface BudgetOverviewCardProps {
  selectedMonth: string;
}

export const BudgetOverviewCard: React.FC<BudgetOverviewCardProps> = ({ selectedMonth }) => {
  const { account } = useAuth();
  const { expenses } = useExpense();

  const [year, month] = selectedMonth.split('-').map(Number);
  const monthNum = month;

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['budgets', account?.id, monthNum, year],
    queryFn: () => budgetService.getBudgets(account!, monthNum, year),
    enabled: !!account?.id,
  });

  const categoryData = React.useMemo(() => {
    const categoriesWithBudget = new Set<string>();
    budgets.forEach((b) => {
      if (b.categories && b.categories.length > 0) {
        b.categories.forEach((c) => categoriesWithBudget.add(c));
      } else if (b.category) {
        categoriesWithBudget.add(b.category);
      }
    });

    const result: { category: string; budget: number; spent: number }[] = [];
    categoriesWithBudget.forEach((cat) => {
      const budget = budgets
        .filter((b) => budgetAppliesToCategory(b, cat))
        .reduce((s, b) => s + b.monthly_amount, 0);

      const spent = expenses
        .filter(
          (e) =>
            e.category === cat &&
            e.status !== 'rejected' &&
            (() => {
              const d = new Date(e.date);
              return d.getMonth() === monthNum - 1 && d.getFullYear() === year;
            })()
        )
        .reduce((s, e) => s + e.amount, 0);

      result.push({ category: cat, budget, spent });
    });

    return result.sort((a, b) => b.budget - a.budget);
  }, [budgets, expenses, monthNum, year]);

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (categoryData.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            סקירת תקציב
          </CardTitle>
          <CardDescription>לא הוגדרו תקציבים לחודש זה</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            הגדר תקציבים בהגדרות החשבון כדי לעקוב אחר ההוצאות.
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link to="/account-settings">
              <Settings className="h-4 w-4 ml-2" />
              הגדרות חשבון
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          סקירת תקציב
        </CardTitle>
        <CardDescription>תקציב מול הוצאה לפי קטגוריה</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {categoryData.map(({ category, budget, spent }) => {
          const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
          const isOver = spent > budget;
          const isWarning = !isOver && pct >= 90;

          return (
            <div
              key={category}
              className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20"
            >
              <span className="flex-1 font-medium">{category}</span>
              <div className="text-left">
                <span className="text-sm text-muted-foreground">
                  ₪{spent.toLocaleString()} / ₪{budget.toLocaleString()}
                </span>
                <div
                  className={`text-sm font-semibold ${isOver ? 'text-destructive' : isWarning ? 'text-amber-600' : 'text-green-600'}`}
                >
                  {pct}%
                </div>
              </div>
            </div>
          );
        })}
        <Button variant="outline" size="sm" className="w-full mt-2" asChild>
          <Link to="/account-settings">
            <Settings className="h-4 w-4 ml-2" />
            ניהול תקציבים
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};
