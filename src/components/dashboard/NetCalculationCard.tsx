import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card className="relative overflow-hidden bg-gradient-to-br from-background/95 to-background/80 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-500 group animate-fade-in">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <CardHeader className="relative pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <div className="p-2 rounded-xl bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-950/50 dark:to-red-950/50 group-hover:scale-110 transition-transform duration-300">
            <Calculator className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            חישוב נטו
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="relative space-y-4">
        {/* Net result */}
        <div className="space-y-3">
          <div className="text-sm font-semibold text-muted-foreground flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            תוצאה נטו:
          </div>
          
          {netResult.type === 'insufficient_users' && (
            <div className="text-center p-4 bg-gradient-to-r from-muted/50 to-muted/30 backdrop-blur-sm rounded-xl border border-border/50">
              <div className="text-sm text-muted-foreground">{netResult.message}</div>
            </div>
          )}

          {netResult.type === 'balanced' && (
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl border border-green-200 dark:border-green-800 animate-scale-in">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="h-6 w-6 text-green-600 animate-bounce" />
                <div className="font-bold text-green-700 dark:text-green-400 text-lg">{netResult.message}</div>
              </div>
              <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded-lg">אין צורך בהעברת כסף</div>
            </div>
          )}

          {netResult.type === 'transfer' && (
            <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 rounded-xl border border-orange-200 dark:border-orange-800 animate-scale-in">
              <div className="flex items-center justify-center gap-2 mb-2">
                <ArrowRightLeft className="h-6 w-6 text-orange-600 animate-pulse" />
                <div className="font-bold text-orange-700 dark:text-orange-400 text-lg">
                  {netResult.message}
                </div>
              </div>
              <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded-lg text-center">
                הפרש נטו: ₪{netResult.amount}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};