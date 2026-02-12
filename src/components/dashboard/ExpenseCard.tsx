
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, CreditCard, XCircle } from 'lucide-react';
import { AccountMember } from '@/contexts/auth/types';

const WALLET_FATHER = '/avatars/wallets/father.png';
const WALLET_MOTHER = '/avatars/wallets/mother.png';

export interface ExpenseCardProps {
  expense: any;
  accountMembers?: AccountMember[];
  onApprove?: () => void;
  onReject?: () => void;
  onMarkPaid?: () => void;
}

export const ExpenseCard = ({ expense, accountMembers = [], onApprove, onReject, onMarkPaid }: ExpenseCardProps) => {
  const sortedMembers = [...accountMembers].sort((a, b) => a.user_id.localeCompare(b.user_id));
  const payerMember = sortedMembers.find(m => m.user_id === expense.paidById);
  const payerIndex = payerMember ? sortedMembers.indexOf(payerMember) : -1;

  const paymentWallets = (() => {
    if (sortedMembers.length === 0) return null;
    if (expense.splitEqually) {
      return (
        <div className="flex -space-x-2" title="חצי חצי">
          <img src={WALLET_FATHER} alt="אבא" className="h-8 w-8 object-contain" />
          <img src={WALLET_MOTHER} alt="אמא" className="h-8 w-8 object-contain" />
        </div>
      );
    }
    if (payerMember) {
      const src = payerIndex === 0 ? WALLET_FATHER : WALLET_MOTHER;
      const alt = payerIndex === 0 ? 'אבא' : 'אמא';
      return (
        <img
          src={src}
          alt={alt}
          className="h-8 w-8 object-contain"
          title={expense.paidByName || payerMember.user_name}
        />
      );
    }
    return null;
  })();

  return (
    <Card className="mb-3 sm:mb-4 overflow-hidden">
      <div className="flex flex-col sm:flex-row border-b border-border p-3 sm:p-4 gap-2 sm:gap-0">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
            <h3 className="font-medium text-sm sm:text-base">{expense.description}</h3>
            {expense.isRecurring && (
              <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded w-fit">קבוע</span>
            )}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground">
            {expense.childName && <span>{expense.childName} | </span>}
            <span>{expense.category}</span>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-lg sm:text-xl font-semibold">₪{expense.amount.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">{expense.date}</div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-muted/20 gap-3 sm:gap-2">
        <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
          <div>נוצר על ידי: <span className="font-medium">{expense.creatorName}</span></div>
          <div className="flex flex-col gap-1">
            <div>חייב לשלם: <span className="font-medium">{expense.paidByName}</span></div>
            {paymentWallets && (
              <div className="flex items-center gap-1 mt-1">
                {paymentWallets}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {expense.status === 'pending' && onApprove && onReject && (
            <>
              <Button variant="ghost" size="sm" onClick={onReject} className="text-red-500 h-8 text-xs sm:text-sm">
                <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span>דחה</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={onApprove} className="text-green-500 h-8 text-xs sm:text-sm">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span>אשר</span>
              </Button>
            </>
          )}
          {expense.status === 'approved' && onMarkPaid && (
            <Button variant="outline" size="sm" onClick={onMarkPaid} className="h-8 text-xs sm:text-sm">
              <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
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
