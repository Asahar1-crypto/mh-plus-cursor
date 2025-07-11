
import React from 'react';
import { useAuth } from '@/contexts/auth';
import { useExpense } from '@/contexts/ExpenseContext';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ExpensesSummary } from '@/components/dashboard/ExpensesSummary';
import { ExpensesTabs } from '@/components/dashboard/ExpensesTabs';

import { MonthlyFoodPaymentCard } from '@/components/dashboard/MonthlyFoodPaymentCard';
import PendingInvitationAlert from '@/components/invitation/PendingInvitationAlert';
import AccountDebugInfo from '@/components/debug/AccountDebugInfo';

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
    isLoading
  } = useExpense();

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

  // Get actual data from expense context
  const pendingExpenses = getPendingExpenses();
  const approvedExpenses = getApprovedExpenses();
  const paidExpenses = getPaidExpenses();
  
  const pendingTotal = getTotalPending();
  const approvedTotal = getTotalApproved();
  const paidTotal = paidExpenses.reduce((sum, exp) => sum + exp.amount, 0);

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
    <div className="container mx-auto p-4 space-y-6">
      <PendingInvitationAlert />
      <DashboardHeader userName={user?.email} />
      <ExpensesSummary 
        pendingTotal={pendingTotal}
        pendingCount={pendingExpenses.length}
        approvedTotal={approvedTotal}
        approvedCount={approvedExpenses.length}
        paidTotal={paidTotal}
        paidCount={paidExpenses.length}
      />
      
      <MonthlyFoodPaymentCard />
      
      <ExpensesTabs 
        pendingExpenses={pendingExpenses}
        approvedExpenses={approvedExpenses}
        paidExpenses={paidExpenses}
        onApprove={approveExpense}
        onReject={rejectExpense}
        onMarkPaid={markAsPaid}
      />
      <AccountDebugInfo />
    </div>
  );
};

export default Dashboard;
