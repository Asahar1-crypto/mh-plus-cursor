
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, CreditCard } from 'lucide-react';

interface ExpensesSummaryProps {
  pendingTotal: number;
  pendingCount: number;
  approvedTotal: number;
  approvedCount: number;
  paidTotal: number;
  paidCount: number;
}

export const ExpensesSummary: React.FC<ExpensesSummaryProps> = ({
  pendingTotal,
  pendingCount,
  approvedTotal,
  approvedCount,
  paidTotal,
  paidCount
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>הוצאות ממתינות</CardDescription>
          <CardTitle className="text-2xl">₪{pendingTotal.toFixed(2)}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center">
            <Clock className="mr-2 h-5 w-5 text-amber-500" />
            <span className="text-sm text-muted-foreground">{pendingCount} הוצאות ממתינות לאישור</span>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>הוצאות מאושרות</CardDescription>
          <CardTitle className="text-2xl">₪{approvedTotal.toFixed(2)}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
            <span className="text-sm text-muted-foreground">{approvedCount} הוצאות מאושרות לתשלום</span>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>הוצאות ששולמו החודש</CardDescription>
          <CardTitle className="text-2xl">₪{paidTotal.toFixed(2)}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center">
            <CreditCard className="mr-2 h-5 w-5 text-blue-500" />
            <span className="text-sm text-muted-foreground">{paidCount} הוצאות שולמו</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
