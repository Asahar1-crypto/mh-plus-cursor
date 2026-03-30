
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, CreditCard, XCircle } from 'lucide-react';
import { AccountMember } from '@/contexts/auth/types';
import { useSwipeAction } from '@/hooks/use-swipe';

const WALLET_FATHER = '/avatars/roles/father.webp';
const WALLET_MOTHER = '/avatars/roles/mother.webp';

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
  const creatorMember = accountMembers.find(m => m.user_id === expense.createdBy);
  const creatorName = expense.creatorName && expense.creatorName !== 'Unknown'
    ? expense.creatorName
    : (creatorMember?.user_name ?? expense.creatorName ?? 'לא ידוע');
  const paidByName = expense.paidByName && expense.paidByName !== 'Unknown'
    ? expense.paidByName
    : (payerMember?.user_name ?? expense.paidByName ?? 'לא ידוע');
  const payerIndex = payerMember ? sortedMembers.indexOf(payerMember) : -1;

  // Swipe actions only for pending expenses on mobile
  const canSwipe = expense.status === 'pending' && onApprove && onReject;
  const { ref: swipeRef, handlers } = useSwipeAction({
    onSwipeRight: canSwipe ? onApprove : undefined,
    onSwipeLeft: canSwipe ? onReject : undefined,
    threshold: 80,
  });

  const paymentWallets = (() => {
    if (sortedMembers.length === 0) return null;
    if (expense.splitEqually) {
      return (
        <div className="flex -space-x-2" title="חצי חצי">
          <div className="h-8 w-8 rounded-full flex items-center justify-center overflow-hidden">
            <img src={WALLET_FATHER} alt="אבא" className="w-full h-full object-contain" loading="lazy" />
          </div>
          <div className="h-8 w-8 rounded-full flex items-center justify-center overflow-hidden">
            <img src={WALLET_MOTHER} alt="אמא" className="w-full h-full object-contain" loading="lazy" />
          </div>
        </div>
      );
    }
    if (payerMember) {
      const src = payerIndex === 0 ? WALLET_FATHER : WALLET_MOTHER;
      const alt = payerIndex === 0 ? 'אבא' : 'אמא';
      return (
        <div className="h-8 w-8 rounded-full flex items-center justify-center overflow-hidden" title={paidByName}>
          <img src={src} alt={alt} className="w-full h-full object-contain" loading="lazy" />
        </div>
      );
    }
    return null;
  })();

  return (
    <div className="relative mb-3 sm:mb-4 overflow-hidden rounded-xl">
      {/* Swipe action indicators (behind the card) */}
      {canSwipe && (
        <>
          <div className="absolute inset-y-0 right-0 w-24 flex items-center justify-center bg-green-500/90 rounded-r-xl">
            <CheckCircle className="h-6 w-6 text-white" />
            <span className="text-white text-xs font-bold mr-1">אשר</span>
          </div>
          <div className="absolute inset-y-0 left-0 w-24 flex items-center justify-center bg-red-500/90 rounded-l-xl">
            <span className="text-white text-xs font-bold ml-1">דחה</span>
            <XCircle className="h-6 w-6 text-white" />
          </div>
        </>
      )}

      <Card
        ref={canSwipe ? swipeRef : undefined}
        className="overflow-hidden interactive-card relative z-10"
        {...(canSwipe ? handlers : {})}
      >
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
          <div className="text-right">
            <div className="text-lg sm:text-xl font-semibold">₪{expense.amount.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">{expense.date}</div>
          </div>
        </div>
        {/* Swipe hint for pending expenses on mobile */}
        {canSwipe && (
          <div className="flex items-center justify-center py-1 text-[10px] text-muted-foreground sm:hidden">
            <span>← דחה</span>
            <span className="mx-3">|</span>
            <span>אשר →</span>
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-muted/20 gap-3 sm:gap-2">
          <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
            <div>נוצר על ידי: <span className="font-medium">{creatorName}</span></div>
            <div className="flex flex-col gap-1">
              <div>חייב לשלם: <span className="font-medium">{paidByName}</span></div>
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
                <Button variant="ghost" size="sm" onClick={onReject} className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 h-9 sm:h-8 min-w-[70px] text-xs sm:text-sm transition-colors duration-200">
                  <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                  <span>דחה</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={onApprove} className="text-green-500 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30 h-9 sm:h-8 min-w-[70px] text-xs sm:text-sm transition-colors duration-200">
                  <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                  <span>אשר</span>
                </Button>
              </>
            )}
            {expense.status === 'approved' && onMarkPaid && (
              <Button variant="outline" size="sm" onClick={onMarkPaid} className="h-9 sm:h-8 text-xs sm:text-sm hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors duration-200">
                <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                <span>סמן כשולם</span>
              </Button>
            )}
            {expense.status === 'rejected' && (
              <span className="text-xs bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 px-2.5 py-1 rounded-full font-medium">
                נדחה
              </span>
            )}
            {expense.status === 'paid' && (
              <span className="text-xs bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full font-medium">
                שולם
              </span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
