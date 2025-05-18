
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, CreditCard, XCircle } from 'lucide-react';

export interface ExpenseCardProps {
  expense: any;
  onApprove?: () => void;
  onReject?: () => void;
  onMarkPaid?: () => void;
}

export const ExpenseCard = ({ expense, onApprove, onReject, onMarkPaid }: ExpenseCardProps) => {
  return (
    <Card className="mb-4 overflow-hidden">
      <div className="flex border-b border-border p-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium">{expense.description}</h3>
            {expense.isRecurring && (
              <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded">קבוע</span>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {expense.childName && <span>{expense.childName} | </span>}
            <span>{expense.category}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold">₪{expense.amount.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">{expense.date}</div>
        </div>
      </div>
      <div className="flex items-center justify-between p-2 bg-muted/20">
        <div className="text-sm text-muted-foreground">
          {expense.creatorName}
        </div>
        <div className="flex items-center gap-2">
          {expense.status === 'pending' && onApprove && onReject && (
            <>
              <Button variant="ghost" size="sm" onClick={onReject} className="text-red-500 h-8">
                <XCircle className="h-4 w-4 mr-1" />
                <span>דחה</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={onApprove} className="text-green-500 h-8">
                <CheckCircle className="h-4 w-4 mr-1" />
                <span>אשר</span>
              </Button>
            </>
          )}
          {expense.status === 'approved' && onMarkPaid && (
            <Button variant="outline" size="sm" onClick={onMarkPaid} className="h-8">
              <CreditCard className="h-4 w-4 mr-1" />
              <span>סמן כשולם</span>
            </Button>
          )}
          {expense.status === 'rejected' && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
              נדחה
            </span>
          )}
          {expense.status === 'paid' && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
              שולם
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};
