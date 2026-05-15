import React, { useMemo } from 'react';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import type { SubStepProps } from './CustodyStepTypes';

/** A5 — The other parent. */
export const PartnerPicker: React.FC<SubStepProps> = ({
  state,
  setState,
  onNext,
  onBack,
  hasExistingPartner,
  existingPartnerLabel,
}) => {
  const invalidEmail = useMemo(() => {
    if (state.partnerMode !== 'invite') return false;
    if (!state.inviteEmail) return true;
    return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.inviteEmail);
  }, [state.partnerMode, state.inviteEmail]);

  const canContinue =
    state.partnerMode === 'existing' ||
    state.partnerMode === 'solo' ||
    (state.partnerMode === 'virtual' && state.virtualPartnerName.trim().length > 0) ||
    (state.partnerMode === 'invite' && !invalidEmail);

  // Auto-default: if a partner is already in the account, select option 1.
  React.useEffect(() => {
    if (hasExistingPartner && state.partnerMode === 'virtual' && !state.virtualPartnerName) {
      setState((s) => ({ ...s, partnerMode: 'existing' }));
    }
    // If no existing partner and user hasn't touched partnerMode yet, the
    // state default is already 'virtual' — do nothing.
  }, [hasExistingPartner, state.partnerMode, state.virtualPartnerName, setState]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
          <Users className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">ומי ההורה השני?</h2>
        <p className="text-muted-foreground text-sm">מי חולק/ת איתך את הלו"ז?</p>
      </div>

      <RadioGroup
        value={state.partnerMode}
        onValueChange={(v) =>
          setState((s) => ({ ...s, partnerMode: v as typeof state.partnerMode }))
        }
      >
        <div className="space-y-3">
          {hasExistingPartner && (
            <OptionCard
              id="opt-existing"
              value="existing"
              active={state.partnerMode === 'existing'}
              title={existingPartnerLabel ?? 'ההורה השני שכבר בחשבון'}
              trailing={<ExistingBadge />}
              onClick={() => setState((s) => ({ ...s, partnerMode: 'existing' }))}
            />
          )}

          <OptionCard
            id="opt-invite"
            value="invite"
            active={state.partnerMode === 'invite'}
            title='אני מזמין/ה עכשיו — הזנת אימייל'
            onClick={() => setState((s) => ({ ...s, partnerMode: 'invite' }))}
          >
            {state.partnerMode === 'invite' && (
              <div className="pt-3 animate-in slide-in-from-top duration-300 space-y-1">
                <Label htmlFor="invite-email" className="text-xs text-muted-foreground">
                  דוא"ל
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="name@example.com"
                  value={state.inviteEmail}
                  onChange={(e) =>
                    setState((s) => ({ ...s, inviteEmail: e.target.value }))
                  }
                  dir="ltr"
                  className="text-left"
                />
                {invalidEmail && state.inviteEmail.length > 0 && (
                  <p className="text-xs text-destructive">כתובת אימייל לא תקינה</p>
                )}
              </div>
            )}
          </OptionCard>

          <OptionCard
            id="opt-virtual"
            value="virtual"
            active={state.partnerMode === 'virtual'}
            title="אני אגדיר הכל לבד בינתיים (הורה וירטואלי)"
            hint="אוכל להזמין אותו/ה אחר־כך."
            onClick={() => setState((s) => ({ ...s, partnerMode: 'virtual' }))}
          >
            {state.partnerMode === 'virtual' && (
              <div className="pt-3 animate-in slide-in-from-top duration-300 space-y-1">
                <Label htmlFor="virtual-name" className="text-xs text-muted-foreground">
                  שם ההורה השני
                </Label>
                <Input
                  id="virtual-name"
                  placeholder="לדוגמה: דנה"
                  value={state.virtualPartnerName}
                  onChange={(e) =>
                    setState((s) => ({ ...s, virtualPartnerName: e.target.value }))
                  }
                />
              </div>
            )}
          </OptionCard>

          <OptionCard
            id="opt-solo"
            value="solo"
            active={state.partnerMode === 'solo'}
            title="אני הורה יחיד/ה — אין הורה שני"
            hint='הלו"ז יציג רק אותי.'
            onClick={() => setState((s) => ({ ...s, partnerMode: 'solo' }))}
          />
        </div>
      </RadioGroup>

      {/* Navigation */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1 transition-all duration-300 hover:scale-105"
        >
          חזור
        </Button>
        <Button
          onClick={onNext}
          disabled={!canContinue}
          className="flex-1 bg-gradient-to-r from-primary to-primary/80 transition-all duration-300 hover:scale-105"
        >
          המשך
        </Button>
      </div>
    </div>
  );
};

const ExistingBadge: React.FC = () => (
  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
    כבר בחשבון ✓
  </span>
);

const OptionCard: React.FC<{
  id: string;
  value: string;
  active: boolean;
  title: string;
  hint?: string;
  trailing?: React.ReactNode;
  onClick: () => void;
  children?: React.ReactNode;
}> = ({ id, value, active, title, hint, trailing, onClick, children }) => (
  <div
    onClick={onClick}
    className={cn(
      'flex items-start gap-3 p-4 rounded-lg border-2 transition-all duration-300 cursor-pointer hover:scale-[1.01]',
      active
        ? 'border-primary bg-primary/5 shadow-md'
        : 'border-border hover:border-primary/50',
    )}
  >
    <RadioGroupItem value={value} id={id} className="mt-1" />
    <div className="flex-1">
      <div className="flex items-center gap-2 flex-wrap">
        <Label htmlFor={id} className="cursor-pointer font-semibold">
          {title}
        </Label>
        {trailing}
      </div>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      {children}
    </div>
  </div>
);
