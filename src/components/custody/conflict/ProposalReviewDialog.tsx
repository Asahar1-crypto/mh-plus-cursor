import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/auth';
import { useQueryClient } from '@tanstack/react-query';
import { custodyProposalService } from '@/integrations/supabase/custodyProposalService';
import type {
  ConflictResolutionPayload,
  CustodyProposalRow,
  SwapPayload,
} from '@/integrations/supabase/custodyTypes';
import { formatDayLong } from '@/lib/hebrewDates';

interface ProposalReviewDialogProps {
  proposal: CustodyProposalRow | null;
  proposerName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** E5 + F4 — Recipient's confirmation dialog for conflict resolution / swap. */
export const ProposalReviewDialog: React.FC<ProposalReviewDialogProps> = ({
  proposal,
  proposerName,
  open,
  onOpenChange,
}) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [working, setWorking] = useState<'accept' | 'reject' | null>(null);

  if (!proposal || !user) return null;

  const handleAccept = async () => {
    setWorking('accept');
    try {
      await custodyProposalService.accept(proposal, user.id);
      toast.success('אושר. הלו"ז עודכן.');
      qc.invalidateQueries({ queryKey: ['custody-proposals'] });
      qc.invalidateQueries({ queryKey: ['custody-data'] });
      qc.invalidateQueries({ queryKey: ['custody-audit-recent'] });
      onOpenChange(false);
    } catch (err) {
      console.error('Accept failed:', err);
      toast.error('שמירה נכשלה. נסו שוב.');
    } finally {
      setWorking(null);
    }
  };

  const handleReject = async () => {
    if (!window.confirm('לדחות את ההצעה?')) return;
    setWorking('reject');
    try {
      await custodyProposalService.reject(proposal.id, user.id);
      toast.success(`ההצעה נדחתה. ${proposerName ?? 'המבקש/ת'} יקבל/תקבל התראה.`);
      qc.invalidateQueries({ queryKey: ['custody-proposals'] });
      onOpenChange(false);
    } catch (err) {
      console.error('Reject failed:', err);
      toast.error('לא הצלחנו לדחות. נסו שוב.');
    } finally {
      setWorking(null);
    }
  };

  const body =
    proposal.kind === 'conflict_resolution' ? (
      <ConflictBody payload={proposal.payload as ConflictResolutionPayload} />
    ) : proposal.kind === 'swap' ? (
      <SwapBody payload={proposal.payload as SwapPayload} />
    ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg text-right">
        <DialogHeader>
          <DialogTitle>
            {proposal.kind === 'swap' ? 'בקשת החלפה' : 'הצעת פתרון להתנגשות'}
            {' מ'}
            {proposerName ?? 'ההורה השני'}
          </DialogTitle>
          <DialogDescription>
            {proposal.kind === 'swap'
              ? 'ההחלטה שלך משפיעה רק על שני הימים שמוצגים.'
              : 'התנגשות ביום מסוים בלו"ז.'}
          </DialogDescription>
        </DialogHeader>

        {body}

        {proposal.note && (
          <div className="p-3 rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">הערה:</p>
            <p className="text-sm italic">"{proposal.note}"</p>
          </div>
        )}

        <Alert>
          <AlertDescription className="text-xs">
            אם לא תגיב/י תוך 7 ימים, ההצעה תפוג.
          </AlertDescription>
        </Alert>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={working !== null}
            className="flex-1"
          >
            {working === 'reject' ? 'דוחה...' : 'דחייה'}
          </Button>
          <Button
            onClick={handleAccept}
            disabled={working !== null}
            className="flex-1"
          >
            {working === 'accept' ? 'מאשר...' : 'אשר שינוי'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ConflictBody: React.FC<{ payload: ConflictResolutionPayload }> = ({ payload }) => (
  <div className="space-y-3">
    <div className="p-3 rounded-lg border bg-muted/30">
      <p className="text-xs text-muted-foreground mb-1">תאריך ההתנגשות:</p>
      <p className="font-semibold">{formatDayLong(payload.conflict_date)}</p>
    </div>
    <div className="space-y-1 text-sm">
      <p className="text-xs text-muted-foreground">משמעות:</p>
      <ul className="list-disc list-inside space-y-0.5">
        <li>
          {payload.conflict_date} — אצל ההורה שניצח
        </li>
        {payload.swap_counter_date && (
          <li>{payload.swap_counter_date} — יום תמורה</li>
        )}
      </ul>
    </div>
  </div>
);

const SwapBody: React.FC<{ payload: SwapPayload }> = ({ payload }) => (
  <div className="p-3 rounded-lg border bg-muted/30 space-y-1 text-sm">
    <p className="text-xs text-muted-foreground mb-1">בקשה להחליף:</p>
    <ul className="list-disc list-inside space-y-0.5">
      <li>
        {formatDayLong(payload.from_date)} — עובר אליך
      </li>
      <li>
        {formatDayLong(payload.to_date)} — עובר אליהם
      </li>
    </ul>
  </div>
);
