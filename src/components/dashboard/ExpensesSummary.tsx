
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
      <Card>
        <CardHeader className="pb-2 p-4 sm:p-6">
          <CardDescription className="text-xs sm:text-sm">הוצאות ממתינות</CardDescription>
          <CardTitle className="text-xl sm:text-2xl">₪{pendingTotal.toFixed(2)}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="flex items-center">
            <Clock className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
            <span className="text-xs sm:text-sm text-muted-foreground">
              {pendingCount} הוצאות ממתינות לאישור
            </span>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2 p-4 sm:p-6">
          <CardDescription className="text-xs sm:text-sm">הוצאות מאושרות</CardDescription>
          <CardTitle className="text-xl sm:text-2xl">₪{approvedTotal.toFixed(2)}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="flex items-center">
            <CheckCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
            <span className="text-xs sm:text-sm text-muted-foreground">
              {approvedCount} הוצאות מאושרות לתשלום
            </span>
          </div>
        </CardContent>
      </Card>
      
      <Card className="sm:col-span-2 lg:col-span-1">
        <CardHeader className="pb-2 p-4 sm:p-6">
          <CardDescription className="text-xs sm:text-sm">הוצאות ששולמו החודש</CardDescription>
          <CardTitle className="text-xl sm:text-2xl">₪{paidTotal.toFixed(2)}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="flex items-center">
            <CreditCard className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
            <span className="text-xs sm:text-sm text-muted-foreground">
              {paidCount} הוצאות שולמו
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
