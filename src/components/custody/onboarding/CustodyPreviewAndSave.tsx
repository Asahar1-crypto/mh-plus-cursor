import React, { useMemo, useState } from 'react';
import { CheckCircle2, Info, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { FourteenDayRibbon, buildRibbonDays } from '../shared/FourteenDayRibbon';
import { CustodyLegend } from '../shared/CustodyLegend';
import { PRESET_CATALOG, maskHasDay } from '@/lib/custody/presets';
import { biWeeklyPhase, weekdayIndex } from '@/lib/custody/dateUtils';
import { fromIsoDate } from '@/lib/custody/dateUtils';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import type { DayOwner } from '@/integrations/supabase/custodyTypes';
import type { CustodyStepState, SubStepProps } from './CustodyStepTypes';

interface PreviewAndSaveProps extends SubStepProps {
  onSave: () => Promise<void>;
  onRestart: () => void;
  isSaving: boolean;
}

/** A6 — Summary + 4-week preview + save. */
export const CustodyPreviewAndSave: React.FC<PreviewAndSaveProps> = ({
  state,
  onBack,
  onSave,
  onRestart,
  isSaving,
}) => {
  const [confirmRestart, setConfirmRestart] = useState(false);
  const summary = useMemo(() => buildSummary(state), [state]);
  const startIso = state.startDate!;

  // 4-week preview = 28 days. Reuse the FourteenDayRibbon twice.
  const firstFortnight = useMemo(() => {
    return buildRibbonDays(startIso, (iso) => evaluateDay(iso, state));
  }, [startIso, state]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">מוכן/ה? נעבור על הכל</h2>
      </div>

      {/* Summary */}
      <div className="rounded-lg bg-muted/30 p-4 space-y-2">
        {summary.map(({ label, value }) => (
          <div key={label} className="flex items-start gap-3 text-sm">
            <span className="text-muted-foreground min-w-[8rem]">{label}</span>
            <span className="font-medium text-right flex-1">{value}</span>
          </div>
        ))}
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          תצוגה מקדימה — השבועיים הקרובים:
        </p>
        <FourteenDayRibbon days={firstFortnight} startIso={startIso} />
        <CustodyLegend showNeither className="justify-center" />
      </div>

      <Alert className="bg-muted/40">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          אפשר תמיד לשנות הכל בהגדרות ← לשונית "הגדרות חשבון"
        </AlertDescription>
      </Alert>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isSaving}
          className="flex-1 transition-all duration-300 hover:scale-105"
        >
          חזור
        </Button>
        <Button
          variant="ghost"
          onClick={() => setConfirmRestart(true)}
          disabled={isSaving}
          className="flex-1"
        >
          <RotateCcw className="ml-2 h-4 w-4" />
          התחלה מחדש
        </Button>
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="flex-1 bg-gradient-to-r from-primary to-primary/80 transition-all duration-300 hover:scale-105"
        >
          {isSaving ? 'שומר...' : 'שמור והמשך'}
        </Button>
      </div>

      <AlertDialog open={confirmRestart} onOpenChange={setConfirmRestart}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>לאפס את הלו"ז?</AlertDialogTitle>
            <AlertDialogDescription>
              ההגדרות הנוכחיות ימחקו ותחזרו למסך הראשון.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmRestart(false);
                onRestart();
              }}
            >
              אפס
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function buildSummary(state: CustodyStepState): { label: string; value: string }[] {
  const preset = state.preset ? PRESET_CATALOG[state.preset] : null;
  const out: { label: string; value: string }[] = [];
  out.push({ label: 'תבנית:', value: preset?.labelHe ?? '—' });
  out.push({ label: 'שעת העברה:', value: state.handoffTime });
  if (state.startDate) {
    out.push({
      label: 'התחלה:',
      value: format(fromIsoDate(state.startDate), 'EEEE, dd.MM.yyyy', { locale: he }),
    });
    if (preset?.mask2 !== null) {
      out.push({
        label: 'השבוע הנוכחי:',
        value: state.currentWeekHolder === 'me' ? 'אצלי' : 'אצל ההורה השני',
      });
    }
  }
  let partnerValue = '—';
  switch (state.partnerMode) {
    case 'existing':
      partnerValue = 'ההורה שכבר בחשבון';
      break;
    case 'invite':
      partnerValue = `הזמנה תישלח ל-${state.inviteEmail}`;
      break;
    case 'virtual':
      partnerValue = state.virtualPartnerName
        ? `${state.virtualPartnerName} (וירטואלי)`
        : 'הורה וירטואלי';
      break;
    case 'solo':
      partnerValue = 'הורה יחיד/ה';
      break;
  }
  out.push({ label: 'הורה שני:', value: partnerValue });
  return out;
}

function evaluateDay(iso: string, state: CustodyStepState): DayOwner {
  const preset = state.preset ? PRESET_CATALOG[state.preset] : null;
  if (!preset || !state.startDate) return 'neither';
  const wd = weekdayIndex(iso);

  if (preset.isCustom) {
    const slot = state.customWeek[wd];
    if (slot === 'me') return state.currentWeekHolder === 'other' ? 'B' : 'A';
    if (slot === 'other') return state.currentWeekHolder === 'other' ? 'A' : 'B';
    if (slot === 'alt') {
      if (!state.startDate) return 'A';
      const phase = biWeeklyPhase(iso, state.startDate);
      const firstWeekIsMine = state.currentWeekHolder === 'me';
      const meThisCell = firstWeekIsMine ? phase === 0 : phase === 1;
      return meThisCell ? 'A' : 'B';
    }
    return 'neither';
  }

  const biWeekly = preset.mask2 !== null;
  let activeMask: number;
  if (biWeekly) {
    const phase = biWeeklyPhase(iso, state.startDate);
    activeMask = phase === 0 ? preset.mask1 : preset.mask2 ?? 0;
  } else {
    activeMask = preset.mask1;
  }
  const isMine = maskHasDay(activeMask, wd);

  if (state.currentWeekHolder === 'other') {
    return isMine ? 'B' : 'A';
  }
  return isMine ? 'A' : 'B';
}
