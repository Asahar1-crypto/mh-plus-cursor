
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
      <Card>
        <CardHeader className="pb-2 p-4 sm:p-6">
          <CardDescription className="text-xs sm:text-sm">הוצאות ממתינות</CardDescription>
          <CardTitle className="text-xl sm:text-2xl">₪{summaryData.pending.total.toFixed(2)}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-2">
          <div className="flex items-center">
            <Clock className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
            <span className="text-xs sm:text-sm text-muted-foreground">
              {summaryData.pending.count} הוצאות ממתינות לאישור
            </span>
          </div>
          {summaryData.pending.breakdown.length > 0 && (
            <div className="text-xs space-y-1 mt-2 pt-2 border-t">
              {summaryData.pending.breakdown.map((user, index) => (
                user.amount > 0 && (
                  <div key={index} className="flex justify-between text-muted-foreground">
                    <span>{user.userName}:</span>
                    <span>₪{user.amount.toFixed(0)} ({user.count})</span>
                  </div>
                )
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2 p-4 sm:p-6">
          <CardDescription className="text-xs sm:text-sm">הוצאות מאושרות</CardDescription>
          <CardTitle className="text-xl sm:text-2xl">₪{summaryData.approved.total.toFixed(2)}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-2">
          <div className="flex items-center">
            <CheckCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
            <span className="text-xs sm:text-sm text-muted-foreground">
              {summaryData.approved.count} הוצאות מאושרות לתשלום
            </span>
          </div>
          {summaryData.approved.breakdown.length > 0 && (
            <div className="text-xs space-y-1 mt-2 pt-2 border-t">
              {summaryData.approved.breakdown.map((user, index) => (
                user.amount > 0 && (
                  <div key={index} className="flex justify-between text-muted-foreground">
                    <span>{user.userName}:</span>
                    <span>₪{user.amount.toFixed(0)} ({user.count})</span>
                  </div>
                )
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="sm:col-span-2 lg:col-span-1">
        <CardHeader className="pb-2 p-4 sm:p-6">
          <CardDescription className="text-xs sm:text-sm">הוצאות ששולמו החודש</CardDescription>
          <CardTitle className="text-xl sm:text-2xl">₪{summaryData.paid.total.toFixed(2)}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-2">
          <div className="flex items-center">
            <CreditCard className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
            <span className="text-xs sm:text-sm text-muted-foreground">
              {summaryData.paid.count} הוצאות שולמו
            </span>
          </div>
          {summaryData.paid.breakdown.length > 0 && (
            <div className="text-xs space-y-1 mt-2 pt-2 border-t">
              {summaryData.paid.breakdown.map((user, index) => (
                user.amount > 0 && (
                  <div key={index} className="flex justify-between text-muted-foreground">
                    <span>{user.userName}:</span>
                    <span>₪{user.amount.toFixed(0)} ({user.count})</span>
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
