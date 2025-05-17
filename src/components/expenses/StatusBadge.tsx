
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Expense } from '@/contexts/expense/types';

interface StatusBadgeProps {
  status: Expense['status'];
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">ממתינה לאישור</Badge>;
    case 'approved':
      return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">אושרה</Badge>;
    case 'rejected':
      return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">נדחתה</Badge>;
    case 'paid':
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">שולמה</Badge>;
    default:
      return null;
  }
};
