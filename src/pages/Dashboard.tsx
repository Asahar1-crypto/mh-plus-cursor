import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth';
import { useExpense } from '@/contexts/ExpenseContext';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ExpensesSummary } from '@/components/dashboard/ExpensesSummary';
import { ExpensesTabs } from '@/components/dashboard/ExpensesTabs';
import { MonthlyFoodPaymentCard } from '@/components/dashboard/MonthlyFoodPaymentCard';
import PendingInvitationAlert from '@/components/invitation/PendingInvitationAlert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarIcon, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { ErrorState } from '@/components/ui/state-views';
import { ActivityLog } from '@/components/ActivityLog';
import { toast } from '@/hooks/use-toast';
import { usePromotionNotice } from '@/hooks/usePromotionNotice';
import { isDateInCycle, getCycleLabelHebrew } from '@/utils/billingCycleUtils';

const Dashboard = () => {
  const navigate = useNavigate();
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

  // Wrapper for markAsPaid with confetti animation
  const handleMarkAsPaidWithCelebration = async (id: string) => {
    try {
      await markAsPaid(id);
      
      // Celebration confetti with gold colors
      const confetti = (await import('canvas-confetti')).default;
      const duration = 2500;
      const animationEnd = Date.now() + duration;
      const colors = ['#F59E0B', '#FBBF24', '#FCD34D'];

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        confetti({
          particleCount: 7,
          angle: 60,
          spread: 60,
          origin: { x: 0, y: 0.5 },
          colors: colors,
          ticks: 200,
        });
        confetti({
          particleCount: 7,
          angle: 120,
          spread: 60,
          origin: { x: 1, y: 0.5 },
          colors: colors,
          ticks: 200,
        });
      }, 40);
      
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
              <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 text-center space-y-4">
                <div className="p-4 rounded-full bg-primary/10">
                  <PlusCircle className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
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
                  onClick={() => navigate('/add-expense')}
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
    </div>
  );
};

export default Dashboard;
