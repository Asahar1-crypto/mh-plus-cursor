
import React from 'react';
import { AddExpenseDialog } from '@/components/expenses/AddExpenseDialog';

interface DashboardHeaderProps {
  userName: string | undefined;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ userName }) => {
  return (
    <div className="flex flex-col md:flex-row items-start justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold">שלום, {userName || 'משתמש'}</h1>
        <p className="text-muted-foreground">ברוכים הבאים למערכת הניהול שלך</p>
      </div>
      <div className="mt-4 md:mt-0">
        <AddExpenseDialog />
      </div>
    </div>
  );
};
