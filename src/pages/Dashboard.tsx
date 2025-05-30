
import React from 'react';
import { useAuth } from '@/contexts/auth';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ExpensesSummary } from '@/components/dashboard/ExpensesSummary';
import { ExpensesTabs } from '@/components/dashboard/ExpensesTabs';
import PendingInvitationAlert from '@/components/invitation/PendingInvitationAlert';
import AccountDebugInfo from '@/components/debug/AccountDebugInfo';

const Dashboard = () => {
  const { user, account } = useAuth();

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

  return (
    <div className="container mx-auto p-4 space-y-6">
      <PendingInvitationAlert />
      <DashboardHeader userName={user?.email} />
      <ExpensesSummary 
        pendingTotal={0}
        pendingCount={0}
        approvedTotal={0}
        approvedCount={0}
        paidTotal={0}
        paidCount={0}
      />
      <ExpensesTabs 
        pendingExpenses={[]}
        approvedExpenses={[]}
        paidExpenses={[]}
        onApprove={async () => {}}
        onReject={async () => {}}
        onMarkPaid={async () => {}}
      />
      <AccountDebugInfo />
    </div>
  );
};

export default Dashboard;
