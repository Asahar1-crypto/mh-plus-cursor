import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRightLeft, CheckCircle, Calculator } from 'lucide-react';
import { memberService } from '@/contexts/auth/services/account';
import type { Expense } from '@/contexts/expense/types';

interface NetCalculationCardProps {
  approvedExpenses: Expense[];
  selectedMonth?: string;
}

interface UserBalance {
  userName: string;
  totalPaid: number;
  shouldPay: number;
  balance: number; // positive = needs to pay more, negative = overpaid
}

export const NetCalculationCard: React.FC<NetCalculationCardProps> = ({ 
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

  // Filter approved expenses by selected month if provided
  const filteredApprovedExpenses = useMemo(() => {
    if (!selectedMonth || !approvedExpenses) return approvedExpenses || [];
    
    const [year, month] = selectedMonth.split('-').map(Number);
    const targetMonth = month - 1; // Convert to 0-based month
    const targetYear = year;
    
    return approvedExpenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const isSelectedMonth = expenseDate.getMonth() === targetMonth && expenseDate.getFullYear() === targetYear;
      const isRelevant = expense.status === 'approved'; // Only approved, not paid
      return isSelectedMonth && isRelevant;
    });
  }, [approvedExpenses, selectedMonth]);

  // Calculate breakdown using the same logic as MonthlyFoodPaymentCard
  const breakdown = useMemo(() => {
    if (!accountMembers || !filteredApprovedExpenses) return [];

    const userBalances: { [key: string]: UserBalance } = {};

    // Calculate what each person owes based on the rules:
    // 1. split_equally = true: Only the payer owes their half
    // 2. split_equally = false: The payer owes the full amount to the other person
    
    accountMembers.forEach(member => {
      let totalOwes = 0;
      
      // Go through all expenses and see what this member owes
      filteredApprovedExpenses.forEach(expense => {
        if (expense.paidById === member.user_id) {
          // This member is designated as the one who should pay
          if (expense.splitEqually) {
            // Half-half: only owes their half
            totalOwes += expense.amount / 2;
          } else {
            // Full payment: owes the full amount
            totalOwes += expense.amount;
          }
        }
        // If this member is NOT the payer, they don't owe anything for this expense
      });
      
      userBalances[member.user_id] = {
        userName: member.user_name,
        totalPaid: 0, // Not used in this calculation
        shouldPay: totalOwes,
        balance: totalOwes // Positive means they owe money
      };
    });

    return Object.values(userBalances);
  }, [accountMembers, filteredApprovedExpenses]);

  // Calculate net difference
  const netResult = useMemo(() => {
    if (breakdown.length < 2) {
      return {
        type: 'insufficient_users' as const,
        message: 'נדרשים שני משתמשים לחישוב נטו'
      };
    }

    const userA = breakdown[0];
    const userB = breakdown[1];
    const netDifference = userA.balance - userB.balance;

    if (Math.abs(netDifference) < 1) {
      return {
        type: 'balanced' as const,
        message: 'החשבון מאוזן!'
      };
    }

    if (netDifference > 0) {
      return {
        type: 'transfer' as const,
        from: userA.userName,
        to: userB.userName,
        amount: Math.round(Math.abs(netDifference)),
        message: `${userA.userName} צריך להעביר ₪${Math.round(Math.abs(netDifference))} ל${userB.userName}`
      };
    } else {
      return {
        type: 'transfer' as const,
        from: userB.userName,
        to: userA.userName,
        amount: Math.round(Math.abs(netDifference)),
        message: `${userB.userName} צריך להעביר ₪${Math.round(Math.abs(netDifference))} ל${userA.userName}`
      };
    }
  }, [breakdown]);

  

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50 shadow-xl hover:shadow-2xl overflow-hidden relative group hover:scale-105 transition-all duration-500">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-red-500/15 opacity-60 group-hover:opacity-90 transition-opacity duration-300"></div>
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-orange-400/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
      
      <CardHeader className="pb-3 p-4 sm:p-6 relative z-10">
        <div className="flex items-center justify-between">
          <CardDescription className="text-sm font-semibold text-orange-700 dark:text-orange-300 bg-orange-100/50 dark:bg-orange-900/30 px-3 py-1 rounded-full">
            חישוב נטו החודש
          </CardDescription>
          <div className="p-2 bg-orange-500/20 rounded-full group-hover:bg-orange-500/30 transition-colors duration-300">
            <ArrowRightLeft className="h-5 w-5 text-orange-600 dark:text-orange-400 animate-pulse group-hover:animate-ping transition-all duration-300" />
          </div>
        </div>
        <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300 origin-left">
          תוצאה נטו
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 sm:p-6 pt-0 space-y-3 relative z-10">
        {netResult.type === 'insufficient_users' && (
          <div className="text-center p-4 bg-gradient-to-r from-muted/80 to-muted/60 backdrop-blur-sm rounded-xl border border-border/50">
            <div className="text-sm text-muted-foreground">{netResult.message}</div>
          </div>
        )}

        {netResult.type === 'balanced' && (
          <div className="p-4 bg-gradient-to-r from-green-100/80 to-emerald-100/80 dark:from-green-900/40 dark:to-emerald-900/40 backdrop-blur-sm rounded-xl border border-green-200/50 dark:border-green-700/50 animate-scale-in">
            <div className="flex items-center justify-center gap-3 mb-2">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 animate-bounce" />
              <div className="font-bold text-green-700 dark:text-green-300 text-lg">{netResult.message}</div>
            </div>
            <div className="text-xs text-green-600/80 dark:text-green-400/80 bg-background/30 backdrop-blur-sm p-2 rounded-lg text-center">
              אין צורך בהעברת כסף
            </div>
          </div>
        )}

        {netResult.type === 'transfer' && (
          <div className="p-4 bg-gradient-to-r from-orange-100/80 to-red-100/80 dark:from-orange-900/40 dark:to-red-900/40 backdrop-blur-sm rounded-xl border border-orange-200/50 dark:border-orange-700/50 animate-scale-in">
            <div className="flex items-center justify-center gap-3 mb-3">
              <ArrowRightLeft className="h-6 w-6 text-orange-600 dark:text-orange-400 animate-pulse" />
              <div className="font-bold text-orange-700 dark:text-orange-300 text-center leading-tight">
                {netResult.message}
              </div>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <div className="text-xs text-orange-600/80 dark:text-orange-400/80 bg-background/30 backdrop-blur-sm px-3 py-1 rounded-full font-mono">
                ₪{netResult.amount}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};