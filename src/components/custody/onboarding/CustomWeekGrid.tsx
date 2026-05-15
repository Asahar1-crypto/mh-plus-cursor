import React from 'react';
import { HomeIcon, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WeekGridInput } from '../shared/WeekGridInput';
import { CustodyLegend } from '../shared/CustodyLegend';
import type { SubStepProps } from './CustodyStepTypes';

/** A2 — Custom weekly grid (only shown when preset === 'custom'). */
export const CustomWeekGrid: React.FC<SubStepProps> = ({
  state,
  setState,
  onNext,
  onBack,
}) => {
  const counts = state.customWeek.reduce(
    (acc, s) => {
      acc[s]++;
      return acc;
    },
    { me: 0, other: 0, alt: 0 },
  );

  const allEmpty = counts.me === 0 && counts.other === 0 && counts.alt === 0;
  const noOtherDays = !allEmpty && counts.other === 0 && counts.alt === 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
          <HomeIcon className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">שבוע רגיל — מי מחזיק בכל יום?</h2>
        <p className="text-muted-foreground text-sm">
          לחצו על כל יום כדי להחליף בין: אני / ההורה השני / לסירוגין
        </p>
        <p className="text-muted-foreground text-xs">
          "לסירוגין" = שבוע אצלי, השבוע הבא אצל ההורה השני.
        </p>
      </div>

      {/* Grid */}
      <WeekGridInput
        value={state.customWeek}
        onChange={(next) => setState((s) => ({ ...s, customWeek: next }))}
      />

      <CustodyLegend
        meLabel="אני"
        otherLabel="ההורה השני"
        showShared={false}
        className="justify-center"
      />

      {/* Summary */}
      <Alert className="bg-secondary/30" role="status" aria-live="polite">
        <AlertDescription className="text-sm text-right">
          סיכום: אני {counts.me} ימים · ההורה השני {counts.other} ימים · לסירוגין {counts.alt}
        </AlertDescription>
      </Alert>

      {allEmpty && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            צריך לסמן לפחות יום אחד.
          </AlertDescription>
        </Alert>
      )}

      {noOtherDays && (
        <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/40">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            כל הימים מסומנים כשלך. ודאו שזה מה שהתכוונתם.
          </AlertDescription>
        </Alert>
      )}

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
          disabled={allEmpty}
          className="flex-1 bg-gradient-to-r from-primary to-primary/80 transition-all duration-300 hover:scale-105"
        >
          המשך
        </Button>
      </div>
    </div>
  );
};
