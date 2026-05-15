import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth';
import { useExpense } from '@/contexts/ExpenseContext';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { HeroBalanceCard } from '@/components/dashboard/HeroBalanceCard';
import { MonthEndCallout } from '@/components/dashboard/MonthEndCallout';
import { ExpensesSummary } from '@/components/dashboard/ExpensesSummary';
import { PaymentSuccessModal } from '@/components/payment/PaymentSuccessModal';
import { MascotImage } from '@/components/mascot/MascotImage';
import { ExpensesTabs } from '@/components/dashboard/ExpensesTabs';
import { MonthlyFoodPaymentCard } from '@/components/dashboard/MonthlyFoodPaymentCard';
import PendingInvitationAlert from '@/components/invitation/PendingInvitationAlert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarIcon, PlusCircle } from 'lucide-react';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { useAddExpenseModal } from '@/hooks/useAddExpenseModal';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { ErrorState } from '@/components/ui/state-views';
import { ActivityLog } from '@/components/ActivityLog';
import { toast } from '@/hooks/use-toast';
import { usePromotionNotice } from '@/hooks/usePromotionNotice';
import { isDateInCycle, getCycleLabelHebrew } from '@/utils/billingCycleUtils';

const Dashboard = () => {
  const { openModal } = useAddExpenseModal();
  const { user, account } = useAuth();

  const billingDay = account?.billing_cycle_start_day ?? 1;

  // Detect and notify admin when a virtual partner has been promoted to a real user
  usePromotionNotice(account, user?.id ?? null);
  const {
    getPendingExpenses,
    getApprovedExpenses,
    getPaidExpenses,
    getTotalPending,
    getTotalApproved,
    approveExpense,
    rejectExpense,
    markAsPaid,
    isLoading,
    error,
    expenses,
    refreshData
  } = useExpense();

  // State for selected month - default to current month
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Generate month options for the last 12 months and next 6 months
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();

    // Add previous 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = billingDay > 1
        ? getCycleLabelHebrew(billingDay, date.getMonth() + 1, date.getFullYear())
        : date.toLocaleDateString('he-IL', { year: 'numeric', month: 'long' });
      options.push({ value, label });
    }

    // Add next 6 months
    for (let i = 1; i <= 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = billingDay > 1
        ? getCycleLabelHebrew(billingDay, date.getMonth() + 1, date.getFullYear())
        : date.toLocaleDateString('he-IL', { year: 'numeric', month: 'long' });
      options.push({ value, label });
    }

    return options;
  }, [billingDay]);

  // Filter expenses by selected month (billing cycle aware)
  const filteredExpenses = useMemo(() => {
    if (!selectedMonth) return expenses;

    const [year, month] = selectedMonth.split('-').map(Number);

    return expenses.filter(expense => isDateInCycle(expense.date, billingDay, month, year));
  }, [expenses, selectedMonth, billingDay]);

  // Calculate filtered data for current month
  const { filteredPending, filteredApproved, filteredPaid, pendingTotal, approvedTotal, paidTotal } = useMemo(() => {
    const pending = filteredExpenses.filter(exp => exp.status === 'pending' && !exp.isRecurring);
    const approved = filteredExpenses.filter(exp => exp.status === 'approved');
    const paid = filteredExpenses.filter(exp => exp.status === 'paid');
    
    return {
      filteredPending: pending,
      filteredApproved: approved,
      filteredPaid: paid,
      pendingTotal: pending.reduce((sum, exp) => sum + exp.amount, 0),
      approvedTotal: approved.reduce((sum, exp) => sum + exp.amount, 0),
      paidTotal: paid.reduce((sum, exp) => sum + exp.amount, 0)
    };
  }, [filteredExpenses]);

  // Get ALL approved expenses (not filtered by month) for PreviousMonthsCard
  const allApprovedExpenses = useMemo(() => {
    return expenses.filter(exp => exp.status === 'approved');
  }, [expenses]);

  // Previous billing period total — drives the HeroBalanceCard delta.
  // We back up one calendar month from the currently selected one and reuse
  // the same isDateInCycle helper so the comparison respects billingDay.
  const previousPeriodTotal = useMemo(() => {
    if (!selectedMonth) return undefined;
    const [year, month] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1); // month is 1-12, JS Date is 0-11
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth() + 1;
    const prev = expenses.filter(
      (e) =>
        (e.status === 'approved' || e.status === 'paid') &&
        isDateInCycle(e.date, billingDay, prevMonth, prevYear),
    );
    return prev.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, selectedMonth, billingDay]);

  // Rolling baseline — average of the previous 3 *complete* billing cycles.
  // Used by HeroBalanceCard to flag overspending (current > 1.2x baseline).
  // We deliberately skip the currently-selected cycle from the average so
  // mid-cycle data doesn't dilute the comparison.
  const baselineAverage = useMemo(() => {
    if (!selectedMonth) return undefined;
    const [year, month] = selectedMonth.split('-').map(Number);
    const totals: number[] = [];
    for (let i = 1; i <= 3; i++) {
      const ref = new Date(year, month - 1 - i, 1);
      const refMonth = ref.getMonth() + 1;
      const refYear = ref.getFullYear();
      const periodTotal = expenses
        .filter(
          (e) =>
            (e.status === 'approved' || e.status === 'paid') &&
            isDateInCycle(e.date, billingDay, refMonth, refYear),
        )
        .reduce((sum, e) => sum + e.amount, 0);
      // Only include periods that actually had spend — fresh accounts with
      // empty history shouldn't trigger a "warning" on their first month.
      if (periodTotal > 0) totals.push(periodTotal);
    }
    if (totals.length === 0) return undefined;
    return totals.reduce((a, b) => a + b, 0) / totals.length;
  }, [expenses, selectedMonth, billingDay]);

  // Payment-success modal state — the celebration moment now lives in a
  // dedicated component (PaymentSuccessModal) which handles confetti,
  // mascot, gradient amount, and auto-dismiss.
  const [paidCelebration, setPaidCelebration] = useState<{
    open: boolean;
    amount: number;
    description?: string;
  }>({ open: false, amount: 0 });

  const handleMarkAsPaidWithCelebration = async (id: string) => {
    try {
      // Capture the expense before status flips so we can show its details.
      const expense = expenses.find((e) => e.id === id);
      await markAsPaid(id);
      setPaidCelebration({
        open: true,
        amount: expense?.amount ?? 0,
        description: expense?.description,
      });
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "שגיאה בסימון ההוצאה כשולמה — נסה שוב",
        variant: "destructive"
      });
    }
  };

  if (!user || !account) {
    return (
      <>
        <OnboardingModal />
        <DashboardSkeleton />
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <OnboardingModal />
        <DashboardSkeleton />
      </>
    );
  }

  if (error) {
    return (
      <>
        <OnboardingModal />
        <div className="w-full max-w-7xl mx-auto p-3 sm:p-4 md:p-6">
          <ErrorState
            title="שגיאה בטעינת הנתונים"
            message="לא הצלחנו לטעון את ההוצאות. נסה שוב."
            onRetry={refreshData}
          />
        </div>
      </>
    );
  }

  return (
    <div className="bg-gradient-to-br from-background via-background to-primary/5 animate-fade-in">
      <OnboardingModal />
      <div className="w-full max-w-7xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 lg:space-y-8">
        <PendingInvitationAlert />

        <div className="animate-fade-in">
          <DashboardHeader userName={user?.name} />
        </div>

        {/* Month-end callout — only renders in the last 3 days of the cycle */}
        <div className="animate-fade-in [animation-delay:25ms]">
          <MonthEndCallout billingDay={billingDay} selectedMonth={selectedMonth} />
        </div>

        {/* Hero balance — total spent this period */}
        <div className="animate-fade-in [animation-delay:50ms]">
          <HeroBalanceCard
            currentAmount={approvedTotal + paidTotal}
            previousAmount={previousPeriodTotal}
            baselineAverage={baselineAverage}
            budget={account?.monthly_budget ?? undefined}
            label={`ההוצאות · ${
              monthOptions.find((o) => o.value === selectedMonth)?.label ?? ''
            }`}
            mascotPose={paidTotal > 0 && pendingTotal === 0 ? 'success' : undefined}
          />
        </div>

        {/* Month Filter - Liquid Glass */}
        <div className="animate-fade-in [animation-delay:100ms]">
          <Card className="liquid-glass-subtle border-border/30 overflow-hidden">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2 xs:gap-3 sm:gap-4">
                <div className="flex items-center gap-2 xs:gap-3 flex-1 xs:flex-none">
                  <div className="p-1.5 sm:p-2 rounded-full bg-primary/10">
                    <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <label className="text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">סינון לפי חודש:</label>
                </div>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-full xs:w-44 sm:w-52 h-9 sm:h-10 bg-background/80 border-border/50 hover:border-primary/50 transition-colors duration-200 text-xs sm:text-sm">
                    <SelectValue placeholder="בחר חודש" />
                  </SelectTrigger>
                  <SelectContent className="liquid-glass-strong border-border/50">
                    {monthOptions.map(option => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className="hover:bg-primary/10 focus:bg-primary/10 transition-colors duration-200 text-xs sm:text-sm"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="animate-fade-in [animation-delay:200ms]">
          <MonthlyFoodPaymentCard selectedMonth={selectedMonth} billingDay={billingDay} />
        </div>

        <div className="animate-fade-in [animation-delay:300ms]">
          <ExpensesSummary
            pendingExpenses={filteredPending}
            approvedExpenses={filteredApproved}
            paidExpenses={filteredPaid}
            selectedMonth={selectedMonth}
            allApprovedExpenses={allApprovedExpenses}
            billingDay={billingDay}
          />
        </div>

        <div className="animate-fade-in [animation-delay:400ms]">
          {filteredExpenses.length === 0 ? (
            <Card className="liquid-glass-subtle border-border/30 overflow-hidden">
              <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 text-center space-y-5">
                {/* Mascot with cyan glow — replaces the PlusCircle icon */}
                <div className="relative">
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'radial-gradient(circle at 50% 60%, rgba(0,209,255,0.32) 0%, transparent 65%)',
                      transform: 'scale(2)',
                    }}
                  />
                  <MascotImage
                    kind="blue"
                    pose="thinking"
                    size="lg"
                    animate="idle"
                    priority
                    className="relative drop-shadow-2xl"
                  />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg sm:text-xl font-bold text-foreground">
                    אין הוצאות בחודש הנבחר
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground max-w-md">
                    הוסף את ההוצאה הראשונה שלך כדי להתחיל לנהל את התקציב המשפחתי
                  </p>
                </div>
                <Button
                  size="lg"
                  className="mt-2 gap-2 text-base"
                  onClick={openModal}
                >
                  <PlusCircle className="h-5 w-5" />
                  הוסף הוצאה חדשה
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ExpensesTabs
              pendingExpenses={filteredPending}
              approvedExpenses={filteredApproved}
              paidExpenses={filteredPaid}
              totalExpenses={filteredExpenses.length}
              onApprove={approveExpense}
              onReject={rejectExpense}
              onMarkPaid={handleMarkAsPaidWithCelebration}
            />
          )}
        </div>

        <div className="animate-fade-in [animation-delay:500ms]">
          <ActivityLog limit={30} />
        </div>

      </div>

      <PaymentSuccessModal
        open={paidCelebration.open}
        onClose={() => setPaidCelebration((s) => ({ ...s, open: false }))}
        amount={paidCelebration.amount}
        description={paidCelebration.description}
      />
    </div>
  );
};

export default Dashboard;
