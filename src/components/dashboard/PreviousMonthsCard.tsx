import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Calendar, CheckCircle } from 'lucide-react';
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
    
    console.log('🔍 PreviousMonthsCard Debug:');
    console.log('Selected month:', selectedMonth);
    console.log('Selected date (first day):', selectedDate);
    console.log('Total approved expenses:', approvedExpenses.length);
    
    const filtered = approvedExpenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const isBeforeSelectedMonth = expenseDate < selectedDate;
      const isApproved = expense.status === 'approved';
      
      console.log(`Expense: ${expense.description} (${expense.date}) - Before selected: ${isBeforeSelectedMonth}, Status: ${expense.status}, Included: ${isBeforeSelectedMonth && isApproved}`);
      
      // Include only expenses that are before the selected month and approved
      return isBeforeSelectedMonth && isApproved;
    });
    
    console.log('Filtered previous months expenses:', filtered.length);
    return filtered;
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
    <Card className="bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50 shadow-xl hover:shadow-2xl overflow-hidden relative group hover:scale-105 transition-all duration-500">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/15 opacity-60 group-hover:opacity-90 transition-opacity duration-300"></div>
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-400/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
      
      <CardHeader className="pb-3 p-4 sm:p-6 relative z-10">
        <div className="flex items-center justify-between">
          <CardDescription className="text-sm font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-900/30 px-3 py-1 rounded-full">
            הוצאות מחודשים קודמים
          </CardDescription>
          <div className="p-2 bg-amber-500/20 rounded-full group-hover:bg-amber-500/30 transition-colors duration-300">
            <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400 animate-pulse group-hover:animate-ping transition-all duration-300" />
          </div>
        </div>
        <CardTitle className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300 origin-left">
          ₪{totalAmount.toFixed(0)}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 sm:p-6 pt-0 space-y-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse shadow-lg shadow-amber-500/50"></div>
          <span className="text-sm font-medium text-muted-foreground">
            {totalCount} הוצאות ממתינות לתשלום
          </span>
        </div>

        {totalCount === 0 ? (
          <div className="text-xs space-y-2 mt-4 pt-4 border-t border-green-200/50 bg-green-100/30 dark:bg-green-900/20 backdrop-blur-sm rounded-lg p-3">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-300 font-medium">
                אין הוצאות ממתינות מחודשים קודמים
              </span>
            </div>
          </div>
        ) : (
          breakdown.length > 0 && (
            <div className="text-xs space-y-2 mt-4 pt-4 border-t border-amber-200/50 bg-background/30 backdrop-blur-sm rounded-lg p-3">
              {breakdown.map((user, index) => (
                <div key={index} className="flex justify-between items-center text-muted-foreground hover:text-foreground transition-colors duration-200">
                  <span className="font-semibold">{user.userName}:</span>
                  <span className="font-mono bg-amber-100/50 dark:bg-amber-900/30 px-2 py-1 rounded">₪{user.amount.toFixed(0)} ({user.count})</span>
                </div>
              ))}
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
};