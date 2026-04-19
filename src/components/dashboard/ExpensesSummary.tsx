
import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, CreditCard } from 'lucide-react';
import { Expense } from '@/contexts/expense/types';
import { calculateBreakdown } from './expenseCalculations';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { memberService } from '@/contexts/auth/services/account/memberService';
import { NetCalculationCard } from './NetCalculationCard';
import { PreviousMonthsCard } from './PreviousMonthsCard';
import { useAnimatedCounter } from '@/hooks/use-animated-counter';

interface ExpensesSummaryProps {
  pendingExpenses: Expense[];
  approvedExpenses: Expense[];
  paidExpenses: Expense[];
  selectedMonth?: string;
  allApprovedExpenses?: Expense[];
  billingDay?: number;
}

export const ExpensesSummary: React.FC<ExpensesSummaryProps> = ({
  pendingExpenses,
  approvedExpenses,
  paidExpenses,
  selectedMonth,
  allApprovedExpenses,
  billingDay = 1
}) => {
  const { account } = useAuth();
  
  // Get account members
  const { data: rawAccountMembers } = useQuery({
    queryKey: ['account-members', account?.id],
    queryFn: () => memberService.getAccountMembers(account!.id),
    enabled: !!account?.id
  });

  // Virtual partner support: augment members list when solo user has virtual partner
  const accountMembers = useMemo(() => {
    if (!rawAccountMembers) return rawAccountMembers;
    const hasVP = rawAccountMembers.length === 1 && !!account?.virtual_partner_name && !!account?.virtual_partner_id;
    if (hasVP) {
      return [
        ...rawAccountMembers,
        { user_id: account!.virtual_partner_id!, user_name: account!.virtual_partner_name!, role: 'member' as const, joined_at: '' }
      ];
    }
    return rawAccountMembers;
  }, [rawAccountMembers, account?.virtual_partner_name, account?.virtual_partner_id]);

  // Calculate totals and breakdown by user
  const summaryData = useMemo(() => {
    return {
      pending: calculateBreakdown(pendingExpenses, accountMembers),
      approved: calculateBreakdown(approvedExpenses, accountMembers),
      paid: calculateBreakdown(paidExpenses, accountMembers)
    };
  }, [pendingExpenses, approvedExpenses, paidExpenses, accountMembers]);

  const isPersonalPlan = account?.plan_slug === 'personal';
  const hasVirtualPartner = (rawAccountMembers?.length ?? 0) < 2 && !!account?.virtual_partner_name && !!account?.virtual_partner_id;
  // Show settlement UI when it's a family plan OR solo user with virtual partner
  const showSettlementUI = !isPersonalPlan || hasVirtualPartner;

  const animatedPending = useAnimatedCounter(summaryData.pending.total);
  const animatedApproved = useAnimatedCounter(summaryData.approved.total);
  const animatedPaid = useAnimatedCounter(summaryData.paid.total);

  return (
    <div className={`grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 ${showSettlementUI ? 'xl:grid-cols-5' : 'xl:grid-cols-4'} gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8`}>
      {/* כרטיס הוצאות ממתינות - מוסתר בתוכנית אישית ללא שותף וירטואלי */}
      {showSettlementUI && (
      <Card className="bg-card border border-amber-200/50 dark:border-amber-800/30 shadow-md hover:shadow-lg overflow-hidden relative group transition-shadow duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/10"></div>

        <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4 md:p-6 relative z-10">
          <div className="flex items-center justify-between">
            <CardDescription className="text-xs sm:text-sm font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-900/30 px-2 sm:px-3 py-1 rounded-full">
              הוצאות ממתינות
            </CardDescription>
            <div className="p-1.5 sm:p-2 bg-amber-500/20 rounded-full">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            ₪{animatedPending.toLocaleString()}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0 space-y-2 sm:space-y-3 relative z-10">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-amber-500 rounded-full"></div>
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
              {summaryData.pending.count} הוצאות ממתינות לאישור
            </span>
          </div>
          {summaryData.pending.breakdown.length > 0 && (
            <div className="text-xs space-y-1.5 sm:space-y-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-amber-200/30 dark:border-amber-800/30 rounded-lg p-2 sm:p-3">
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
      <Card className="bg-card border border-green-200/50 dark:border-green-800/30 shadow-md hover:shadow-lg overflow-hidden relative group transition-shadow duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/10"></div>

        <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4 md:p-6 relative z-10">
          <div className="flex items-center justify-between">
            <CardDescription className="text-xs sm:text-sm font-semibold text-green-700 dark:text-green-300 bg-green-100/50 dark:bg-green-900/30 px-2 sm:px-3 py-1 rounded-full">
              הוצאות מאושרות
            </CardDescription>
            <div className="p-1.5 sm:p-2 bg-green-500/20 rounded-full">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            ₪{animatedApproved.toLocaleString()}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0 space-y-2 sm:space-y-3 relative z-10">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full"></div>
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
              {summaryData.approved.count} הוצאות מאושרות לתשלום
            </span>
          </div>
          {summaryData.approved.breakdown.length > 0 && (
            <div className="text-xs space-y-1.5 sm:space-y-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-green-200/30 dark:border-green-800/30 rounded-lg p-2 sm:p-3">
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
      <Card className="bg-card border border-blue-200/50 dark:border-blue-800/30 shadow-md hover:shadow-lg overflow-hidden relative group transition-shadow duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/10"></div>

        <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4 md:p-6 relative z-10">
          <div className="flex items-center justify-between">
            <CardDescription className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 bg-blue-100/50 dark:bg-blue-900/30 px-2 sm:px-3 py-1 rounded-full">
              הוצאות ששולמו החודש
            </CardDescription>
            <div className="p-1.5 sm:p-2 bg-blue-500/20 rounded-full">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            ₪{animatedPaid.toLocaleString()}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0 space-y-2 sm:space-y-3 relative z-10">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full"></div>
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
              {summaryData.paid.count} הוצאות שולמו
            </span>
          </div>
          {summaryData.paid.breakdown.length > 0 && (
            <div className="text-xs space-y-1.5 sm:space-y-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-blue-200/30 dark:border-blue-800/30 rounded-lg p-2 sm:p-3">
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
        billingDay={billingDay}
      />
      
      {/* Previous Months Card */}
      <PreviousMonthsCard
        approvedExpenses={allApprovedExpenses || approvedExpenses}
        selectedMonth={selectedMonth}
        billingDay={billingDay}
      />
    </div>
  );
};
