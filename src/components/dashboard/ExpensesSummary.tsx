
import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, CreditCard } from 'lucide-react';
import { Expense } from '@/contexts/expense/types';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { memberService } from '@/contexts/auth/services/account/memberService';

interface ExpensesSummaryProps {
  pendingExpenses: Expense[];
  approvedExpenses: Expense[];
  paidExpenses: Expense[];
}

export const ExpensesSummary: React.FC<ExpensesSummaryProps> = ({
  pendingExpenses,
  approvedExpenses, 
  paidExpenses
}) => {
  const { account } = useAuth();
  
  // Get account members
  const { data: accountMembers } = useQuery({
    queryKey: ['account-members', account?.id],
    queryFn: () => memberService.getAccountMembers(account!.id),
    enabled: !!account?.id
  });

  // Calculate totals and breakdown by user
  const summaryData = useMemo(() => {
    const calculateBreakdown = (expenses: Expense[]) => {
      const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const count = expenses.length;
      
      if (!accountMembers || accountMembers.length === 0) {
        return { total, count, breakdown: [] };
      }

      const breakdown = accountMembers.map(member => {
        let userTotal = 0;
        let userCount = 0;
        
        expenses.forEach(exp => {
          if (exp.paidById === member.user_id) {
            // This member paid the expense
            if (exp.splitEqually) {
              userTotal += exp.amount / 2; // Only their half
            } else {
              userTotal += exp.amount; // Full amount
            }
            userCount++;
          } else if (exp.splitEqually && accountMembers.some(m => m.user_id === exp.paidById)) {
            // This member didn't pay, but it's split equally and someone else from the account paid
            userTotal += exp.amount / 2; // They owe their half
            userCount++;
          }
        });
        
        return {
          userName: member.user_name,
          amount: userTotal,
          count: userCount
        };
      });

      return { total, count, breakdown };
    };

    return {
      pending: calculateBreakdown(pendingExpenses),
      approved: calculateBreakdown(approvedExpenses),
      paid: calculateBreakdown(paidExpenses)
    };
  }, [pendingExpenses, approvedExpenses, paidExpenses, accountMembers]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
      {/* כרטיס הוצאות ממתינות */}
      <Card className="glass shadow-card border-0 overflow-hidden relative group hover:shadow-glow transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10"></div>
        <CardHeader className="pb-2 p-4 sm:p-6 relative">
          <div className="flex items-center justify-between">
            <CardDescription className="text-xs sm:text-sm font-medium text-amber-600 dark:text-amber-400">
              הוצאות ממתינות
            </CardDescription>
            <Clock className="h-5 w-5 text-amber-500 animate-pulse-slow" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-bold gradient-primary bg-clip-text text-transparent">
            ₪{summaryData.pending.total.toFixed(0)}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-2 relative">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
            <span className="text-xs sm:text-sm text-muted-foreground">
              {summaryData.pending.count} הוצאות ממתינות לאישור
            </span>
          </div>
          {summaryData.pending.breakdown.length > 0 && (
            <div className="text-xs space-y-1 mt-3 pt-3 border-t border-amber-200/50">
              {summaryData.pending.breakdown.map((user, index) => (
                user.amount > 0 && (
                  <div key={index} className="flex justify-between text-muted-foreground">
                    <span className="font-medium">{user.userName}:</span>
                    <span className="font-mono">₪{user.amount.toFixed(0)} ({user.count})</span>
                  </div>
                )
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* כרטיס הוצאות מאושרות */}
      <Card className="glass shadow-card border-0 overflow-hidden relative group hover:shadow-glow transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10"></div>
        <CardHeader className="pb-2 p-4 sm:p-6 relative">
          <div className="flex items-center justify-between">
            <CardDescription className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400">
              הוצאות מאושרות
            </CardDescription>
            <CheckCircle className="h-5 w-5 text-green-500 animate-pulse-slow" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-bold gradient-primary bg-clip-text text-transparent">
            ₪{summaryData.approved.total.toFixed(0)}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-2 relative">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs sm:text-sm text-muted-foreground">
              {summaryData.approved.count} הוצאות מאושרות לתשלום
            </span>
          </div>
          {summaryData.approved.breakdown.length > 0 && (
            <div className="text-xs space-y-1 mt-3 pt-3 border-t border-green-200/50">
              {summaryData.approved.breakdown.map((user, index) => (
                user.amount > 0 && (
                  <div key={index} className="flex justify-between text-muted-foreground">
                    <span className="font-medium">{user.userName}:</span>
                    <span className="font-mono">₪{user.amount.toFixed(0)} ({user.count})</span>
                  </div>
                )
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* כרטיס הוצאות ששולמו */}
      <Card className="glass shadow-card border-0 overflow-hidden relative group hover:shadow-glow transition-all duration-300 sm:col-span-2 lg:col-span-1">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10"></div>
        <CardHeader className="pb-2 p-4 sm:p-6 relative">
          <div className="flex items-center justify-between">
            <CardDescription className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400">
              הוצאות ששולמו החודש
            </CardDescription>
            <CreditCard className="h-5 w-5 text-blue-500 animate-pulse-slow" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-bold gradient-primary bg-clip-text text-transparent">
            ₪{summaryData.paid.total.toFixed(0)}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-2 relative">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-xs sm:text-sm text-muted-foreground">
              {summaryData.paid.count} הוצאות שולמו
            </span>
          </div>
          {summaryData.paid.breakdown.length > 0 && (
            <div className="text-xs space-y-1 mt-3 pt-3 border-t border-blue-200/50">
              {summaryData.paid.breakdown.map((user, index) => (
                user.amount > 0 && (
                  <div key={index} className="flex justify-between text-muted-foreground">
                    <span className="font-medium">{user.userName}:</span>
                    <span className="font-mono">₪{user.amount.toFixed(0)} ({user.count})</span>
                  </div>
                )
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
