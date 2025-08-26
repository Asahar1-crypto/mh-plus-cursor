import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Calendar } from 'lucide-react';
import { memberService } from '@/contexts/auth/services/account';
import type { Expense } from '@/contexts/expense/types';

interface PreviousMonthsCardProps {
  approvedExpenses: Expense[];
  selectedMonth?: string;
}

interface UserBalance {
  userName: string;
  amount: number;
  count: number;
}

export const PreviousMonthsCard: React.FC<PreviousMonthsCardProps> = ({ 
  approvedExpenses, 
  selectedMonth 
}) => {
  const { account } = useAuth();
  
  // Get account members
  const { data: accountMembers } = useQuery({
    queryKey: ['account-members', account?.id],
    queryFn: () => memberService.getAccountMembers(account!.id),
    enabled: !!account?.id
  });

  // Filter approved expenses from previous months (not current month and not paid)
  const previousMonthsExpenses = useMemo(() => {
    if (!selectedMonth || !approvedExpenses) return [];
    
    const [year, month] = selectedMonth.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, 1); // First day of selected month
    
    return approvedExpenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      // Include only expenses that are before the selected month and not paid
      return expenseDate < selectedDate && expense.status === 'approved';
    });
  }, [approvedExpenses, selectedMonth]);

  // Calculate breakdown by user
  const breakdown = useMemo(() => {
    if (!accountMembers || !previousMonthsExpenses) return [];

    const userTotals: { [key: string]: UserBalance } = {};

    // Initialize user totals
    accountMembers.forEach(member => {
      userTotals[member.user_id] = {
        userName: member.user_name,
        amount: 0,
        count: 0
      };
    });

    // Calculate totals per user
    previousMonthsExpenses.forEach(expense => {
      if (userTotals[expense.paidById]) {
        userTotals[expense.paidById].amount += expense.amount;
        userTotals[expense.paidById].count += 1;
      }
    });

    return Object.values(userTotals).filter(user => user.amount > 0);
  }, [accountMembers, previousMonthsExpenses]);

  const totalAmount = previousMonthsExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalCount = previousMonthsExpenses.length;

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-background/95 to-background/80 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-500 group animate-fade-in">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <CardHeader className="relative pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/50 dark:to-orange-950/50 group-hover:scale-110 transition-transform duration-300">
            <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            חודשים קודמים
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="relative space-y-4">
        {/* Total amount */}
        <div className="text-center p-3 bg-gradient-to-r from-muted/50 to-muted/30 backdrop-blur-sm rounded-xl border border-border/50">
          <div className="text-2xl font-bold">₪{totalAmount.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">{totalCount} הוצאות מאושרות</div>
        </div>

        {/* Status indicator */}
        <div className="text-center">
          <div className="text-sm font-semibold text-muted-foreground mb-3 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
            ממתינות לתשלום
          </div>
          
          {totalCount === 0 ? (
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl border border-green-200 dark:border-green-800">
              <div className="text-green-700 dark:text-green-400 font-medium">
                אין הוצאות ממתינות מחודשים קודמים
              </div>
            </div>
          ) : (
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-amber-600 animate-pulse" />
                <div className="font-bold text-amber-700 dark:text-amber-400">
                  {totalCount} הוצאות ממתינות לתשלום
                </div>
              </div>
              <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded-lg">
                הוצאות שאושרו בחודשים קודמים ועדיין לא שולמו
              </div>
            </div>
          )}
        </div>

        {/* Individual breakdown if there are expenses */}
        {breakdown.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="text-sm font-medium text-center text-muted-foreground">פילוח לפי משתמש:</div>
            {breakdown.map((user, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-gradient-to-r from-background/80 to-background/60 backdrop-blur-sm rounded-lg border border-border/30">
                <span className="text-sm font-medium">{user.userName}</span>
                <span className="text-sm font-bold">₪{user.amount.toLocaleString()} ({user.count})</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};