import React, { useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { FourteenDayRibbon, buildRibbonDays } from '../shared/FourteenDayRibbon';
import { addIsoDays, fromIsoDate, toIsoDate, weekdayIndex } from '@/lib/custody/dateUtils';
import { biWeeklyPhase } from '@/lib/custody/dateUtils';
import { PRESET_CATALOG, maskHasDay } from '@/lib/custody/presets';
import type { DayOwner } from '@/integrations/supabase/custodyTypes';
import type { SubStepProps } from './CustodyStepTypes';

/**
 * A4 — Start date + "which parent holds the current week" for bi-weekly
 * rotations. Skipped when preset isn't bi-weekly.
 */
export const StartDateAndHolder: React.FC<SubStepProps> = ({
  state,
  setState,
  onNext,
  onBack,
}) => {
  const startIso = state.startDate ?? nextSundayIso();
  const preset = state.preset;

  const invalidFuture = useMemo(() => {
    if (!state.startDate) return false;
    const start = fromIsoDate(state.startDate);
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    return start > oneYearFromNow;
  }, [state.startDate]);

  const isPast = useMemo(() => {
    if (!state.startDate) return false;
    return state.startDate < toIsoDate(new Date());
  }, [state.startDate]);

  const ribbonDays = useMemo(() => {
    return buildRibbonDays(startIso, (iso) => evaluateDay(iso, state, startIso));
  }, [startIso, state]);

  const selectedDate = state.startDate ? fromIsoDate(state.startDate) : undefined;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
          <CalendarDays className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">מאיזה תאריך מתחיל הלו"ז?</h2>
        <p className="text-muted-foreground text-sm">
          ובאיזה שבוע אנחנו נמצאים כרגע?
        </p>
      </div>

      {/* Start-date picker */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">תאריך התחלה</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              aria-label='תאריך התחלת הלו"ז, לחצו לבחירה'
              className={cn(
                'w-full justify-start text-right font-normal',
                !state.startDate && 'text-muted-foreground',
              )}
            >
              <CalendarDays className="ml-2 h-4 w-4" />
              {state.startDate
                ? format(fromIsoDate(state.startDate), 'EEEE, dd.MM.yyyy', { locale: he })
                : 'בחרו תאריך'}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) setState((s) => ({ ...s, startDate: toIsoDate(date) }));
              }}
              locale={he}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {invalidFuture && (
          <p className="text-xs text-destructive">בחרו תאריך עד שנה קדימה</p>
        )}
        {isPast && !invalidFuture && (
          <p className="text-xs text-muted-foreground">
            תאריך עבר — הלו"ז יחושב רטרואקטיבית
          </p>
        )}
      </div>

      {/* Current-week holder toggle */}
      {preset && state.startDate && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold">
            השבוע הנוכחי ({currentWeekRangeLabel(startIso)}) הוא:
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <HolderCard
              label="אצלי"
              active={state.currentWeekHolder === 'me'}
              variant="me"
              onClick={() => setState((s) => ({ ...s, currentWeekHolder: 'me' }))}
            />
            <HolderCard
              label="אצל ההורה השני"
              active={state.currentWeekHolder === 'other'}
              variant="other"
              onClick={() => setState((s) => ({ ...s, currentWeekHolder: 'other' }))}
            />
          </div>
        </div>
      )}

      {/* 14-day preview */}
      {state.startDate && !invalidFuture && (
        <div className="space-y-2 animate-in fade-in duration-300">
          <Label className="text-xs text-muted-foreground">
            כך ייראו השבועיים הקרובים:
          </Label>
          <FourteenDayRibbon days={ribbonDays} startIso={startIso} />
        </div>
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
          disabled={!state.startDate || invalidFuture}
          className="flex-1 bg-gradient-to-r from-primary to-primary/80 transition-all duration-300 hover:scale-105"
        >
          המשך
        </Button>
      </div>
    </div>
  );
};

const HolderCard: React.FC<{
  label: string;
  variant: 'me' | 'other';
  active: boolean;
  onClick: () => void;
}> = ({ label, variant, active, onClick }) => (
  <button
    type="button"
    role="radio"
    aria-checked={active}
    onClick={onClick}
    className={cn(
      'flex items-center justify-center p-3 rounded-lg border-2 transition-all duration-200 text-sm font-semibold',
      active && variant === 'me' && 'border-primary bg-primary/5 text-primary shadow-md',
      active && variant === 'other' && 'border-accent bg-accent/10 text-accent-foreground shadow-md',
      !active && 'border-border hover:border-primary/50',
    )}
  >
    {label}
  </button>
);

function nextSundayIso(): string {
  const today = new Date();
  const daysToAdd = (7 - today.getDay()) % 7 || 7;
  const sun = new Date(today);
  sun.setDate(today.getDate() + daysToAdd);
  return toIsoDate(sun);
}

function currentWeekRangeLabel(startIso: string): string {
  const d = fromIsoDate(startIso);
  const end = addIsoDays(startIso, 6);
  const e = fromIsoDate(end);
  return `${d.getDate()}.${d.getMonth() + 1} – ${e.getDate()}.${e.getMonth() + 1}`;
}

/**
 * Given an ISO date, evaluate ownership for the preview ribbon.
 * Uses the current state (preset/customWeek/holder) to decide who holds the
 * date. "me" = parent A; "other" = parent B; "shared" = both; undefined = neither.
 */
function evaluateDay(
  iso: string,
  state: SubStepProps['state'],
  startIso: string,
): DayOwner {
  const { preset } = state;
  if (!preset) return 'neither';

  const def = PRESET_CATALOG[preset];
  const wd = weekdayIndex(iso);

  if (def.isCustom) {
    const slot = state.customWeek[wd];
    if (slot === 'me') return state.currentWeekHolder === 'other' ? 'B' : 'A';
    if (slot === 'other') return state.currentWeekHolder === 'other' ? 'A' : 'B';
    if (slot === 'alt') {
      // Alternating day: week 1 goes to the "current holder"; week 2 flips.
      const phase = biWeeklyPhase(iso, startIso);
      const firstWeekIsMine = state.currentWeekHolder === 'me';
      const meThisCell = firstWeekIsMine ? phase === 0 : phase === 1;
      return meThisCell ? 'A' : 'B';
    }
    return 'neither';
  }

  const biWeekly = def.mask2 !== null;
  let activeMask: number;
  if (biWeekly) {
    const phase = biWeeklyPhase(iso, startIso);
    activeMask = phase === 0 ? def.mask1 : def.mask2 ?? 0;
  } else {
    activeMask = def.mask1;
  }
  const isMine = maskHasDay(activeMask, wd);

  // If the current-week holder flipped to "other", invert the ownership.
  if (state.currentWeekHolder === 'other') {
    return isMine ? 'B' : 'A';
  }
  return isMine ? 'A' : 'B';
}
