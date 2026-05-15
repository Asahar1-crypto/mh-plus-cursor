import React, { useState } from 'react';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, ArrowLeft } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/auth';
import { useQueryClient } from '@tanstack/react-query';
import { custodyProposalService } from '@/integrations/supabase/custodyProposalService';
import { formatDayLong } from '@/lib/hebrewDates';
import { fromIsoDate, toIsoDate, addDays } from '@/lib/custody/dateUtils';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import type { SwapPayload } from '@/integrations/supabase/custodyTypes';

interface SwapRequestSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromDateIso: string | null;
  partnerUserId: string | null;
  partnerName: string | null;
}

/** F1-F3 — Swap request flow: pick counter-day, add note, send. */
export const SwapRequestSheet: React.FC<SwapRequestSheetProps> = ({
  open,
  onOpenChange,
  fromDateIso,
  partnerUserId,
  partnerName,
}) => {
  const { user, account } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState<'pick' | 'note'>('pick');
  const [toDate, setToDate] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  React.useEffect(() => {
    if (!open) {
      setStep('pick');
      setToDate(null);
      setNote('');
    }
  }, [open]);

  const canContinue = toDate !== null && toDate !== fromDateIso;

  const handleSend = async () => {
    if (!fromDateIso || !toDate || !user?.id || !account?.id || !partnerUserId) return;
    setSending(true);
    try {
      const payload: SwapPayload = {
        kind: 'swap',
        from_date: fromDateIso,
        to_date: toDate,
      };
      await custodyProposalService.create({
        accountId: account.id,
        proposerId: user.id,
        recipientId: partnerUserId,
        payload,
        note: note.trim() || null,
      });
      toast.success(`הבקשה נשלחה ל${partnerName ?? 'הורה השני'}.`);
      qc.invalidateQueries({ queryKey: ['custody-proposals'] });
      onOpenChange(false);
    } catch (err) {
      console.error('Swap request failed:', err);
      toast.error('לא הצלחנו לשלוח. נסו שוב.');
    } finally {
      setSending(false);
    }
  };

  const minDate = fromDateIso ? addDays(fromIsoDate(fromDateIso), -60) : new Date();
  const maxDate = fromDateIso ? addDays(fromIsoDate(fromDateIso), 60) : new Date();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-right">החלפת יום</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pt-3">
          <div className="p-3 rounded-lg bg-muted/30 text-sm">
            <p className="text-xs text-muted-foreground mb-1">יום המקור:</p>
            <p className="font-semibold">
              {fromDateIso ? formatDayLong(fromDateIso) : ''} — אצלך
            </p>
          </div>

          {step === 'pick' ? (
            <>
              <div className="space-y-1">
                <Label className="text-sm font-semibold">בחר/י יום תמורה</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-right font-normal',
                        !toDate && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {toDate
                        ? format(fromIsoDate(toDate), 'EEEE, dd.MM.yyyy', { locale: he })
                        : 'בחרו תאריך'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={toDate ? fromIsoDate(toDate) : undefined}
                      onSelect={(d) => d && setToDate(toIsoDate(d))}
                      disabled={(date) => date < minDate || date > maxDate}
                      locale={he}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {toDate && fromDateIso && (
                <div className="text-sm space-y-1 p-3 rounded-lg bg-secondary/30">
                  <p className="font-semibold text-xs text-muted-foreground">
                    אחרי ההחלפה:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>
                      {fromDateIso} — אצל {partnerName ?? 'ההורה השני'}
                    </li>
                    <li>{toDate} — אצלך</li>
                  </ul>
                </div>
              )}

              <Alert>
                <AlertDescription className="text-xs">
                  ההחלפה דורשת אישור של ההורה השני.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                  disabled={sending}
                >
                  ביטול
                </Button>
                <Button
                  onClick={() => setStep('note')}
                  disabled={!canContinue}
                  className="flex-1"
                >
                  המשך
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <Label className="text-xs">הוסף/י הערה (לא חובה)</Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder='למשל: "יש לי חופש בעבודה ואני רוצה ליום הזה"'
                  className="resize-none"
                  rows={3}
                  maxLength={200}
                />
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={() => setStep('pick')}
                  disabled={sending}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 ml-1" />
                  חזור
                </Button>
                <Button onClick={handleSend} disabled={sending} className="flex-1">
                  {sending ? 'שולח...' : `שלח ל${partnerName ?? 'הורה השני'}`}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
