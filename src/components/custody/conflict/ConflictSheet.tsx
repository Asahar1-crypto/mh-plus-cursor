import React, { useState } from 'react';
import { toast } from 'sonner';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/auth';
import { useQueryClient } from '@tanstack/react-query';
import { custodyProposalService } from '@/integrations/supabase/custodyProposalService';
import { formatDayLong } from '@/lib/hebrewDates';
import { fromIsoDate, toIsoDate } from '@/lib/custody/dateUtils';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import type { ConflictResolutionPayload, ResolvedDay } from '@/integrations/supabase/custodyTypes';

interface ConflictSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflictDay: ResolvedDay | null;
  partnerUserId: string | null;
  partnerName: string | null;
  myName: string | null;
}

type ResolutionChoice = 'keep_mine' | 'give_partner' | 'swap';

/** E3 — Conflict detail bottom sheet with 3 resolution options. */
export const ConflictSheet: React.FC<ConflictSheetProps> = ({
  open,
  onOpenChange,
  conflictDay,
  partnerUserId,
  partnerName,
  myName,
}) => {
  const { user, account } = useAuth();
  const qc = useQueryClient();
  const [choice, setChoice] = useState<ResolutionChoice>('keep_mine');
  const [counterDate, setCounterDate] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const canSubmit =
    choice !== 'swap' || (counterDate !== null && counterDate !== conflictDay?.date);

  const handleSubmit = async () => {
    if (!conflictDay || !user?.id || !account?.id || !partnerUserId) return;
    setSending(true);
    try {
      const winnerId =
        choice === 'keep_mine' ? user.id : choice === 'give_partner' ? partnerUserId : user.id;
      const payload: ConflictResolutionPayload = {
        kind: 'conflict_resolution',
        conflict_date: conflictDay.date,
        winner_user_id: winnerId,
        swap_counter_date: choice === 'swap' ? counterDate : null,
      };
      await custodyProposalService.create({
        accountId: account.id,
        proposerId: user.id,
        recipientId: partnerUserId,
        payload,
        note: note.trim() || null,
      });
      toast.success(`ההצעה נשלחה ל${partnerName ?? 'הורה השני'}. נחכה לאישור.`);
      qc.invalidateQueries({ queryKey: ['custody-proposals'] });
      setNote('');
      setCounterDate(null);
      setChoice('keep_mine');
      onOpenChange(false);
    } catch (err) {
      console.error('Conflict proposal failed:', err);
      toast.error('לא הצלחנו לשלוח. נסו שוב.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-right">
            התנגשות ב{conflictDay ? formatDayLong(conflictDay.date) : ''}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pt-3">
          {/* Claim cards side by side */}
          <div className="grid grid-cols-2 gap-2">
            <ClaimCard who="me" name={myName ?? 'אני'} />
            <ClaimCard who="partner" name={partnerName ?? 'ההורה השני'} />
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">איך לפתור?</h4>
            <RadioGroup
              value={choice}
              onValueChange={(v) => setChoice(v as ResolutionChoice)}
            >
              <div className="space-y-2">
                <ChoiceRow value="keep_mine" active={choice === 'keep_mine'} label="נשאר אצלי" />
                <ChoiceRow
                  value="give_partner"
                  active={choice === 'give_partner'}
                  label={`עובר ל${partnerName ?? 'הורה השני'}`}
                />
                <ChoiceRow
                  value="swap"
                  active={choice === 'swap'}
                  label="הצע החלפה (יום תמורה)"
                >
                  {choice === 'swap' && (
                    <div className="mt-2 space-y-1">
                      <Label className="text-xs">בחרו יום להחלפה</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-right font-normal',
                              !counterDate && 'text-muted-foreground',
                            )}
                          >
                            <CalendarIcon className="ml-2 h-4 w-4" />
                            {counterDate
                              ? format(fromIsoDate(counterDate), 'EEEE, dd.MM.yyyy', {
                                  locale: he,
                                })
                              : 'בחרו תאריך'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={counterDate ? fromIsoDate(counterDate) : undefined}
                            onSelect={(d) => d && setCounterDate(toIsoDate(d))}
                            locale={he}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </ChoiceRow>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">הערה (לא חובה)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder='למשל: "אני רוצה אותם בסוף שבוע אחר במקום"'
              className="resize-none"
              rows={2}
              maxLength={200}
            />
          </div>

          <Alert>
            <AlertDescription className="text-xs">
              כל החלטה צריכה אישור של ההורה השני.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sending}
              className="flex-1"
            >
              ביטול
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={sending || !canSubmit}
              className="flex-1"
            >
              {sending ? 'שולח...' : 'שלח הצעה'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const ClaimCard: React.FC<{ who: 'me' | 'partner'; name: string }> = ({ who, name }) => (
  <div
    className={cn(
      'p-3 rounded-lg border-r-4 text-right',
      who === 'me' ? 'bg-primary/10 border-primary' : 'bg-accent/10 border-accent',
    )}
  >
    <p className="text-xs text-muted-foreground">טוען/ת</p>
    <p className="text-sm font-bold">{name}</p>
  </div>
);

const ChoiceRow: React.FC<{
  value: string;
  active: boolean;
  label: string;
  children?: React.ReactNode;
}> = ({ value, active, label, children }) => (
  <label
    className={cn(
      'flex flex-col gap-1 p-3 rounded-lg border-2 cursor-pointer transition-colors',
      active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
    )}
  >
    <div className="flex items-center gap-2">
      <RadioGroupItem value={value} />
      <span className="text-sm font-semibold">{label}</span>
    </div>
    {children}
  </label>
);
