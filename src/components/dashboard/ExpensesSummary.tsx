
import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, CreditCard } from 'lucide-react';
import { Expense } from '@/contexts/expense/types';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { memberService } from '@/contexts/auth/services/account/memberService';
import { NetCalculationCard } from './NetCalculationCard';
import { PreviousMonthsCard } from './PreviousMonthsCard';

interface ExpensesSummaryProps {
  pendingExpenses: Expense[];
  approvedExpenses: Expense[];
  paidExpenses: Expense[];
  selectedMonth?: string;
  allApprovedExpenses?: Expense[];
}

export const ExpensesSummary: React.FC<ExpensesSummaryProps> = ({
  pendingExpenses,
  approvedExpenses, 
  paidExpenses,
  selectedMonth,
  allApprovedExpenses
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

  const isPersonalPlan = account?.plan_slug === 'personal';

  return (
    <div className={`grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 ${isPersonalPlan ? 'xl:grid-cols-4' : 'xl:grid-cols-5'} gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8`}>
      {/* כרטיס הוצאות ממתינות - מוסתר בתוכנית אישית */}
      {!isPersonalPlan && (
      <Card className="bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50 shadow-xl hover:shadow-2xl overflow-hidden relative group hover:scale-105 transition-all duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/15 opacity-60 group-hover:opacity-90 transition-opacity duration-300"></div>
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-400/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
        
        <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4 md:p-6 relative z-10">
          <div className="flex items-center justify-between">
            <CardDescription className="text-xs sm:text-sm font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-900/30 px-2 sm:px-3 py-1 rounded-full">
              הוצאות ממתינות
            </CardDescription>
            <div className="p-1.5 sm:p-2 bg-amber-500/20 rounded-full group-hover:bg-amber-500/30 transition-colors duration-300">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400 animate-pulse group-hover:animate-spin transition-all duration-300" />
            </div>
          </div>
          <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300 origin-left">
            ₪{summaryData.pending.total.toFixed(0)}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0 space-y-2 sm:space-y-3 relative z-10">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-amber-500 rounded-full animate-pulse shadow-lg shadow-amber-500/50"></div>
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
              {summaryData.pending.count} הוצאות ממתינות לאישור
            </span>
          </div>
          {summaryData.pending.breakdown.length > 0 && (
            <div className="text-xs space-y-1.5 sm:space-y-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-amber-200/50 bg-background/30 backdrop-blur-sm rounded-lg p-2 sm:p-3">
              {summaryData.pending.breakdown.map((user, index) => (
                user.amount > 0 && (
                  <div key={index} className="flex justify-between items-center text-muted-foreground hover:text-foreground transition-colors duration-200">
                    <span className="font-semibold truncate ml-2">{user.userName}:</span>
                    <span className="font-mono bg-amber-100/50 dark:bg-amber-900/30 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded whitespace-nowrap">₪{user.amount.toFixed(0)} ({user.count})</span>
                  </div>
                )
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      )}
      
      {/* כרטיס הוצאות מאושרות */}
      <Card className="bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50 shadow-xl hover:shadow-2xl overflow-hidden relative group hover:scale-105 transition-all duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/15 opacity-60 group-hover:opacity-90 transition-opacity duration-300"></div>
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-green-400/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
        
        <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4 md:p-6 relative z-10">
          <div className="flex items-center justify-between">
            <CardDescription className="text-xs sm:text-sm font-semibold text-green-700 dark:text-green-300 bg-green-100/50 dark:bg-green-900/30 px-2 sm:px-3 py-1 rounded-full">
              הוצאות מאושרות
            </CardDescription>
            <div className="p-1.5 sm:p-2 bg-green-500/20 rounded-full group-hover:bg-green-500/30 transition-colors duration-300">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400 animate-pulse group-hover:animate-bounce transition-all duration-300" />
            </div>
          </div>
          <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300 origin-left">
            ₪{summaryData.approved.total.toFixed(0)}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0 space-y-2 sm:space-y-3 relative z-10">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
              {summaryData.approved.count} הוצאות מאושרות לתשלום
            </span>
          </div>
          {summaryData.approved.breakdown.length > 0 && (
            <div className="text-xs space-y-1.5 sm:space-y-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-green-200/50 bg-background/30 backdrop-blur-sm rounded-lg p-2 sm:p-3">
              {summaryData.approved.breakdown.map((user, index) => (
                user.amount > 0 && (
                  <div key={index} className="flex justify-between items-center text-muted-foreground hover:text-foreground transition-colors duration-200">
                    <span className="font-semibold truncate ml-2">{user.userName}:</span>
                    <span className="font-mono bg-green-100/50 dark:bg-green-900/30 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded whitespace-nowrap">₪{user.amount.toFixed(0)} ({user.count})</span>
                  </div>
                )
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* כרטיס הוצאות ששולמו */}
      <Card className="bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50 shadow-xl hover:shadow-2xl overflow-hidden relative group hover:scale-105 transition-all duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/15 opacity-60 group-hover:opacity-90 transition-opacity duration-300"></div>
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
        
        <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4 md:p-6 relative z-10">
          <div className="flex items-center justify-between">
            <CardDescription className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 bg-blue-100/50 dark:bg-blue-900/30 px-2 sm:px-3 py-1 rounded-full">
              הוצאות ששולמו החודש
            </CardDescription>
            <div className="p-1.5 sm:p-2 bg-blue-500/20 rounded-full group-hover:bg-blue-500/30 transition-colors duration-300">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400 animate-pulse group-hover:animate-ping transition-all duration-300" />
            </div>
          </div>
          <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300 origin-left">
            ₪{summaryData.paid.total.toFixed(0)}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0 space-y-2 sm:space-y-3 relative z-10">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full animate-pulse shadow-lg shadow-blue-500/50"></div>
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
              {summaryData.paid.count} הוצאות שולמו
            </span>
          </div>
          {summaryData.paid.breakdown.length > 0 && (
            <div className="text-xs space-y-1.5 sm:space-y-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-blue-200/50 bg-background/30 backdrop-blur-sm rounded-lg p-2 sm:p-3">
              {summaryData.paid.breakdown.map((user, index) => (
                user.amount > 0 && (
                  <div key={index} className="flex justify-between items-center text-muted-foreground hover:text-foreground transition-colors duration-200">
                    <span className="font-semibold truncate ml-2">{user.userName}:</span>
                    <span className="font-mono bg-blue-100/50 dark:bg-blue-900/30 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded whitespace-nowrap">₪{user.amount.toFixed(0)} ({user.count})</span>
                  </div>
                )
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Net Calculation Card */}
      <NetCalculationCard 
        approvedExpenses={approvedExpenses}
        selectedMonth={selectedMonth}
      />
      
      {/* Previous Months Card */}
      <PreviousMonthsCard 
        approvedExpenses={allApprovedExpenses || approvedExpenses}
        selectedMonth={selectedMonth}
      />
    </div>
  );
};
