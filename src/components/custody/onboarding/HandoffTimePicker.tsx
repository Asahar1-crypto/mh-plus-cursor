import React from 'react';
import { Clock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import type { SubStepProps } from './CustodyStepTypes';

type PresetOption = 'after_school' | 'evening' | 'custom';

const AFTER_SCHOOL = '14:00';
const EVENING = '18:00';

function detectOption(time: string): PresetOption {
  if (time === AFTER_SCHOOL) return 'after_school';
  if (time === EVENING) return 'evening';
  return 'custom';
}

/** A3 — Handoff time. */
export const HandoffTimePicker: React.FC<SubStepProps> = ({
  state,
  setState,
  onNext,
  onBack,
}) => {
  const option = detectOption(state.handoffTime);
  const [customDraft, setCustomDraft] = React.useState<string>(
    option === 'custom' ? state.handoffTime : '18:00',
  );

  const pickOption = (next: PresetOption) => {
    if (next === 'after_school') {
      setState((s) => ({ ...s, handoffTime: AFTER_SCHOOL }));
    } else if (next === 'evening') {
      setState((s) => ({ ...s, handoffTime: EVENING }));
    } else {
      setState((s) => ({ ...s, handoffTime: customDraft }));
    }
  };

  const canContinue =
    option !== 'custom' || /^\d{2}:\d{2}$/.test(state.handoffTime);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
          <Clock className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">שעת ההעברה בין הבתים</h2>
        <p className="text-muted-foreground text-sm">
          מתי בדרך כלל הילדים עוברים מבית לבית בימי החלפה?
        </p>
      </div>

      <RadioGroup
        value={option}
        onValueChange={(v) => pickOption(v as PresetOption)}
        aria-labelledby="handoff-title"
      >
        <div className="space-y-3">
          <OptionCard
            id="opt-after-school"
            value="after_school"
            active={option === 'after_school'}
            title={`אחרי ביה"ס — ${AFTER_SCHOOL}`}
            hint="טוב לגיל גן / יסודי"
            onClick={() => pickOption('after_school')}
          />

          <OptionCard
            id="opt-evening"
            value="evening"
            active={option === 'evening'}
            title={`ערב — ${EVENING}`}
            trailing={<DefaultPill />}
            hint="אחרי חוגים וארוחת צהריים"
            onClick={() => pickOption('evening')}
          />

          <OptionCard
            id="opt-custom"
            value="custom"
            active={option === 'custom'}
            title="מותאם — בחרו שעה"
            onClick={() => pickOption('custom')}
          >
            {option === 'custom' && (
              <div className="pt-3 animate-in slide-in-from-top duration-300">
                <Label htmlFor="custom-time" className="text-xs text-muted-foreground">
                  שעה
                </Label>
                <Input
                  id="custom-time"
                  type="time"
                  value={customDraft}
                  onChange={(e) => {
                    setCustomDraft(e.target.value);
                    setState((s) => ({ ...s, handoffTime: e.target.value }));
                  }}
                  className="max-w-[8rem] mt-1"
                />
              </div>
            )}
          </OptionCard>
        </div>
      </RadioGroup>

      <Alert className="bg-muted/40">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          זה רק ברירת מחדל. לכל יום אפשר לקבוע שעה אחרת בלו"ז.
        </AlertDescription>
      </Alert>

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

const DefaultPill: React.FC = () => (
  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
    ברירת מחדל
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
