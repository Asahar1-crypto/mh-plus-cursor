
import React from 'react';
import { useAuth } from '@/contexts/auth';
import PendingInvitationAlert from '@/components/invitation/PendingInvitationAlert';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ExpensesSummary } from '@/components/dashboard/ExpensesSummary';
import { ExpensesTabs } from '@/components/dashboard/ExpensesTabs';
import { useExpenseManager } from '@/hooks/useExpenseManager';

const Dashboard = () => {
  const { user } = useAuth();
  
  const {
    pendingExpenses,
    approvedExpenses,
    paidExpenses,
    pendingTotal,
    approvedTotal,
    paidTotal,
    approveExpense,
    rejectExpense,
    markAsPaid
  } = useExpenseManager();
  
  return (
    <div className="container mx-auto animate-fade-in">
      {/* Always show the PendingInvitationAlert component */}
      <PendingInvitationAlert />
      
      <DashboardHeader userName={user?.name} />

      <ExpensesSummary
        pendingTotal={pendingTotal}
        pendingCount={pendingExpenses.length}
        approvedTotal={approvedTotal}
        approvedCount={approvedExpenses.length}
        paidTotal={paidTotal}
        paidCount={paidExpenses.length}
      />

      <ExpensesTabs
        pendingExpenses={pendingExpenses}
        approvedExpenses={approvedExpenses}
        paidExpenses={paidExpenses}
        onApprove={approveExpense}
        onReject={rejectExpense}
        onMarkPaid={markAsPaid}
      />
    </div>
  );
};

export default Dashboard;
