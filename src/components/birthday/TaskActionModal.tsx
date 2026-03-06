import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BirthdayTask } from '@/integrations/supabase/birthdayService';

type ActionType = 'claim' | 'unclaim' | 'mark_paid' | 'verify' | 'cancel';

interface TaskActionModalProps {
  task: BirthdayTask | null;
  action: ActionType | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (args?: { actualAmount?: number; receiptUrl?: string }) => Promise<void>;
  isLoading?: boolean;
}

const ACTION_TITLES: Record<ActionType, string> = {
  claim: 'לקיחת משימה',
  unclaim: 'שחרור משימה',
  mark_paid: 'הוספת קבלה',
  verify: 'אימות תשלום',
  cancel: 'ביטול משימה',
};

const ACTION_DESCRIPTIONS: Record<ActionType, string> = {
  claim: 'האם לקחת על עצמך את המשימה? לא ניתן יהיה לבחור בה בו-זמנית מההורה השני.',
  unclaim: 'האם לשחרר את המשימה? היא תהיה זמינה שוב לבחירה.',
  mark_paid: 'הכנס סכום ששולם. לאחר מכן ההורה השני יוכל לאמת.',
  verify: 'האם לאמת את התשלום? פעולה זו סופית.',
  cancel: 'האם לבטל את המשימה? לא ניתן לשחזר.',
};

export const TaskActionModal: React.FC<TaskActionModalProps> = ({
  task,
  action,
  open,
  onClose,
  onConfirm,
  isLoading,
}) => {
  const [amount, setAmount] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');

  if (!task || !action) return null;

  const handleConfirm = async () => {
    if (action === 'mark_paid') {
      await onConfirm({ actualAmount: parseFloat(amount) || 0, receiptUrl: receiptUrl || undefined });
    } else {
      await onConfirm();
    }
    setAmount('');
    setReceiptUrl('');
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{ACTION_TITLES[action]}</AlertDialogTitle>
          <AlertDialogDescription>{ACTION_DESCRIPTIONS[action]}</AlertDialogDescription>
        </AlertDialogHeader>

        {action === 'mark_paid' && (
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="amount">סכום ששולם (₪)</Label>
              <Input
                id="amount"
                type="number"
                min={0}
                placeholder={task.estimatedAmount?.toString() ?? '0'}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="receipt">קישור לקבלה (אופציונלי)</Label>
              <Input
                id="receipt"
                type="url"
                placeholder="https://..."
                value={receiptUrl}
                onChange={(e) => setReceiptUrl(e.target.value)}
              />
            </div>
          </div>
        )}

        <AlertDialogFooter className="flex-row-reverse gap-2">
          <AlertDialogCancel onClick={onClose}>ביטול</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading || (action === 'mark_paid' && !amount)}
            className={action === 'cancel' ? 'bg-destructive hover:bg-destructive/90' : ''}
          >
            {isLoading ? 'מעבד...' : 'אישור'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
