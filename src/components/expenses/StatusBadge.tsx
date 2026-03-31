
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Expense } from '@/contexts/expense/types';

interface StatusBadgeProps {
  status: Expense['status'];
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 border-amber-200 dark:border-amber-800/50">ממתינה לאישור</Badge>;
    case 'approved':
      return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 border-green-200 dark:border-green-800/50">אושרה</Badge>;
    case 'rejected':
      return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 border-red-200 dark:border-red-800/50">נדחתה</Badge>;
    case 'paid':
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 border-blue-200 dark:border-blue-800/50">שולמה</Badge>;
    default:
      return null;
  }
};
