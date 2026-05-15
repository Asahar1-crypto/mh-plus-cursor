import React from 'react';
import { AlertTriangle } from 'lucide-react';
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
import { formatDayLong } from '@/lib/hebrewDates';
import { daysAgo } from '@/integrations/supabase/custodyProposalService';

interface HistoricalEditConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateIso: string | null;
  partnerName: string | null;
  onConfirm: () => void;
}

/** G1 — "You're editing the past" confirmation. */
export const HistoricalEditConfirm: React.FC<HistoricalEditConfirmProps> = ({
  open,
  onOpenChange,
  dateIso,
  partnerName,
  onConfirm,
}) => {
  if (!dateIso) return null;
  const ago = daysAgo(dateIso);
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="text-right">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 justify-end">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            עריכת העבר
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block font-semibold text-foreground">
              {formatDayLong(dateIso)}
              {ago > 0 ? ` — לפני ${ago} ימים` : ''}
            </span>
            <span className="block">
              שינוי יתועד ויישלח התראה{' '}
              {partnerName ? `ל${partnerName}` : 'להורה השני'}. ההורה השני יוכל לראות
              את הלפני/אחרי והמבצע.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ביטול</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>המשך עריכה</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
