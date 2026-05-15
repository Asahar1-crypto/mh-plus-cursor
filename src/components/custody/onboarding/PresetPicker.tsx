import React from 'react';
import { HomeIcon, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PresetCard } from '../shared/PresetCard';
import { PRESET_ORDER } from '@/lib/custody/presets';
import type { CustodyPresetKey } from '@/integrations/supabase/custodyTypes';
import type { SubStepProps } from './CustodyStepTypes';

/** A1 — Intro + preset picker. */
export const PresetPicker: React.FC<SubStepProps> = ({
  state,
  setState,
  onNext,
  onBack,
  onSkipAll,
}) => {
  const handleSelect = (key: CustodyPresetKey) => {
    setState((s) => ({ ...s, preset: key }));
  };

  return (
    <div
      className="space-y-6 animate-in fade-in slide-in-from-right duration-500"
      role="radiogroup"
      aria-label="בחירת תבנית משמורת"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2 animate-in zoom-in duration-500">
          <HomeIcon className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">הלו"ז שלי</h2>
        <p className="text-muted-foreground">
          בחרו איך הילדים מחולקים ביניכם בשבוע רגיל
        </p>
        <p className="text-xs text-muted-foreground">
          (אפשר תמיד לשנות בהגדרות החשבון)
        </p>
      </div>

      <Alert
        className="bg-muted/40 animate-in slide-in-from-top duration-500 delay-100"
        aria-label="הודעה: החלוקה לא משפיעה על כספים"
      >
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          החלוקה הזו היא להצגה בלבד — אין לה השפעה על ההוצאות או על החלוקה הכספית ביניכם.
        </AlertDescription>
      </Alert>

      {/* Preset grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-in slide-in-from-bottom duration-500 delay-200">
        {PRESET_ORDER.map((key) => (
          <PresetCard
            key={key}
            presetKey={key}
            selected={state.preset === key}
            onSelect={() => handleSelect(key)}
            showPopularTag={key === 'week_on_week'}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1 transition-all duration-300 hover:scale-105"
        >
          חזור
        </Button>
        {onSkipAll && (
          <Button
            variant="ghost"
            onClick={onSkipAll}
            className="flex-1"
          >
            אדלג לעכשיו
          </Button>
        )}
        <Button
          onClick={onNext}
          disabled={state.preset === null}
          className="flex-1 bg-gradient-to-r from-primary to-primary/80 transition-all duration-300 hover:scale-105"
          title={state.preset === null ? 'בחרו תבנית או "מותאם אישית"' : undefined}
        >
          המשך
        </Button>
      </div>
    </div>
  );
};
