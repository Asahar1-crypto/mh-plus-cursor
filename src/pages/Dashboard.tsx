
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

  // Calculate filtered data
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <div className="w-full max-w-7xl mx-auto space-y-6 p-4 sm:p-6">
        <PendingInvitationAlert />
        <DashboardHeader userName={user?.name} />
        
        {/* Month Filter - Modern Design */}
        <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <CalendarIcon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <label className="text-lg font-semibold text-gray-800 mb-2 block">סינון לפי חודש</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-64 bg-white/90 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20">
                    <SelectValue placeholder="בחר חודש" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-xl z-50 rounded-lg">
                    {monthOptions.map(option => (
                      <SelectItem 
                        key={option.value} 
                        value={option.value}
                        className="hover:bg-blue-50 focus:bg-blue-50"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <ExpensesSummary 
          pendingExpenses={getPendingExpenses()}
          approvedExpenses={getApprovedExpenses()}
          paidExpenses={getPaidExpenses()}
        />
        
        <MonthlyFoodPaymentCard selectedMonth={selectedMonth} />
        
        <ExpensesTabs 
          pendingExpenses={filteredPending}
          approvedExpenses={filteredApproved}
          paidExpenses={filteredPaid}
          onApprove={approveExpense}
          onReject={rejectExpense}
          onMarkPaid={markAsPaid}
        />
        <AccountDebugInfo />
      </div>
    </div>
  );
};

export default Dashboard;
