import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth';
import { useExpense } from '@/contexts/ExpenseContext';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ExpensesSummary } from '@/components/dashboard/ExpensesSummary';
import { ExpensesTabs } from '@/components/dashboard/ExpensesTabs';
import { MonthlyFoodPaymentCard } from '@/components/dashboard/MonthlyFoodPaymentCard';
import PendingInvitationAlert from '@/components/invitation/PendingInvitationAlert';
import AccountDebugInfo from '@/components/debug/AccountDebugInfo';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarIcon } from 'lucide-react';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';

const Dashboard = () => {
  const { user, account } = useAuth();
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
    expenses
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
      const label = date.toLocaleDateString('he-IL', { year: 'numeric', month: 'long' });
      options.push({ value, label });
    }
    
    // Add next 6 months
    for (let i = 1; i <= 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('he-IL', { year: 'numeric', month: 'long' });
      options.push({ value, label });
    }
    
    return options;
  }, []);

  // Filter expenses by selected month
  const filteredExpenses = useMemo(() => {
    if (!selectedMonth) return expenses;
    
    const [year, month] = selectedMonth.split('-').map(Number);
    
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getFullYear() === year && expenseDate.getMonth() === month - 1;
    });
  }, [expenses, selectedMonth]);

  // Calculate filtered data for current month
  const { filteredPending, filteredApproved, filteredPaid, pendingTotal, approvedTotal, paidTotal } = useMemo(() => {
    const pending = filteredExpenses.filter(exp => exp.status === 'pending');
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

  if (!user || !account) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p>טוען נתוני המשתמש...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p>טוען נתונים עבור {account.name}...</p>
        </div>
      </div>
    );
  }

  

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 animate-fade-in">
      <OnboardingModal />
      <div className="w-full max-w-7xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 lg:space-y-8">
        <div className="animate-scale-in">
          <PendingInvitationAlert />
        </div>
        
        <div className="animate-fade-in [animation-delay:200ms]">
          <DashboardHeader userName={user?.name} />
        </div>
        
        {/* Month Filter with enhanced design */}
        <div className="animate-slide-in-right [animation-delay:400ms]">
          <Card className="bg-gradient-to-r from-card/90 to-card/95 backdrop-blur-lg border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardContent className="p-3 sm:p-4 md:p-6 relative">
              <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2 xs:gap-3 sm:gap-4">
                <div className="flex items-center gap-2 xs:gap-3 flex-1 xs:flex-none">
                  <div className="p-1.5 sm:p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
                    <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <label className="text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">סינון לפי חודש:</label>
                </div>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-full xs:w-44 sm:w-52 h-9 sm:h-10 bg-background/80 border-border/50 hover:bg-background hover:border-primary/50 transition-all duration-300 hover:shadow-md text-xs sm:text-sm">
                    <SelectValue placeholder="בחר חודש" />
                  </SelectTrigger>
                  <SelectContent className="bg-background/95 backdrop-blur-lg border border-border/50 shadow-xl">
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
        
        <div className="animate-fade-in [animation-delay:600ms]">
          <ExpensesSummary 
            pendingExpenses={filteredPending}
            approvedExpenses={filteredApproved}
            paidExpenses={filteredPaid}
            selectedMonth={selectedMonth}
            allApprovedExpenses={allApprovedExpenses}
          />
        </div>
        
        <div className="animate-scale-in [animation-delay:800ms]">
          <MonthlyFoodPaymentCard selectedMonth={selectedMonth} />
        </div>
        
        <div className="animate-fade-in [animation-delay:1000ms]">
          <ExpensesTabs 
            pendingExpenses={filteredPending}
            approvedExpenses={filteredApproved}
            paidExpenses={filteredPaid}
            onApprove={approveExpense}
            onReject={rejectExpense}
            onMarkPaid={markAsPaid}
          />
        </div>
        
        <div className="animate-fade-in [animation-delay:1200ms]">
          <AccountDebugInfo />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
