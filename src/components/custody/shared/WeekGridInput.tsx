import React from 'react';
import { cn } from '@/lib/utils';
import { WEEKDAY_LABELS_HE } from '@/integrations/supabase/custodyTypes';

export type DaySlotState = 'me' | 'other' | 'alt';

interface WeekGridInputProps {
  /** 7-length array, index 0 = Sunday. */
  value: DaySlotState[];
  onChange: (next: DaySlotState[]) => void;
  className?: string;
}

const STATE_NEXT: Record<DaySlotState, DaySlotState> = {
  me: 'other',
  other: 'alt',
  alt: 'me',
};

const STATE_LABEL: Record<DaySlotState, string> = {
  me: 'אני',
  other: 'ההורה השני',
  alt: 'לסירוגין',
};

/**
 * 7-day grid where tapping a day cycles its state: אני → ההורה השני → משותף → אני.
 * Designed for A2 custom weekly grid. Tap targets ≥56px; accessible via keyboard.
 */
export const WeekGridInput: React.FC<WeekGridInputProps> = ({
  value,
  onChange,
  className,
}) => {
  const cycleDay = (index: number) => {
    const next = [...value];
    next[index] = STATE_NEXT[next[index]];
    onChange(next);
  };

  return (
    <div
      className={cn(
        'grid grid-cols-7 gap-1.5 sm:gap-2',
        className,
      )}
      role="group"
      aria-label="שבוע רגיל"
    >
      {value.map((state, i) => (
        <DayPill
          key={i}
          label={WEEKDAY_LABELS_HE[i]}
          state={state}
          onClick={() => cycleDay(i)}
          weekdayName={getWeekdayFullName(i)}
        />
      ))}
    </div>
  );
};

function getWeekdayFullName(index: number): string {
  return ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'][index];
}

const DayPill: React.FC<{
  label: string;
  state: DaySlotState;
  weekdayName: string;
  onClick: () => void;
}> = ({ label, state, weekdayName, onClick }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={state !== 'shared'}
      aria-label={`יום ${weekdayName}: ${STATE_LABEL[state]}`}
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-1 min-h-[64px] rounded-lg border-2 transition-all duration-150',
        'active:scale-[0.96] hover:shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        state === 'me' &&
          'bg-primary/15 border-primary text-primary hover:bg-primary/20',
        state === 'other' &&
          'bg-accent/15 border-accent text-accent-foreground hover:bg-accent/25',
        state === 'alt' &&
          'bg-gradient-to-br from-primary/15 to-accent/15 border-muted-foreground/50 border-dashed',
      )}
    >
      <span className="text-xs font-bold leading-none">{label}</span>
      <span className="text-[10px] leading-none text-muted-foreground">
        {STATE_LABEL[state]}
      </span>
    </button>
  );
};
