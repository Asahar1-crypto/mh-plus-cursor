import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addIsoDays, weekdayIndex } from '@/lib/custody/dateUtils';
import { fromIsoDate } from '@/lib/custody/dateUtils';
import type { DayOwner } from '@/integrations/supabase/custodyTypes';
import { WEEKDAY_LABELS_HE } from '@/integrations/supabase/custodyTypes';

interface FourteenDayRibbonProps {
  /** Array of 14 consecutive day states starting from `startIso`. */
  days: { date: string; owner: DayOwner }[];
  startIso: string;
  className?: string;
}

/**
 * Horizontal preview strip of 14 days for the onboarding A4 screen.
 * On mobile (<375px), collapses to 7 days with prev/next pagination.
 */
export const FourteenDayRibbon: React.FC<FourteenDayRibbonProps> = ({
  days,
  className,
}) => {
  const isMobile = useIsSmallScreen();
  const [page, setPage] = useState<0 | 1>(0);

  const visible = useMemo(() => {
    if (!isMobile) return days;
    const start = page === 0 ? 0 : 7;
    return days.slice(start, start + 7);
  }, [isMobile, page, days]);

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-stretch gap-1">
        {isMobile && (
          <button
            type="button"
            aria-label={page === 0 ? 'השבוע הבא' : 'השבוע הקודם'}
            onClick={() => setPage((p) => (p === 0 ? 1 : 0))}
            className="shrink-0 flex items-center justify-center w-8 rounded-md border hover:bg-muted"
          >
            {page === 0 ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        )}
        <div
          className={cn(
            'flex-1 grid gap-1',
            isMobile ? 'grid-cols-7' : 'grid-cols-14',
          )}
        >
          {visible.map((d) => (
            <DayCell key={d.date} date={d.date} owner={d.owner} />
          ))}
        </div>
      </div>
      {isMobile && (
        <p className="mt-1 text-center text-[10px] text-muted-foreground">
          {page === 0 ? 'שבוע 1' : 'שבוע 2'} מתוך 2
        </p>
      )}
    </div>
  );
};

const DayCell: React.FC<{ date: string; owner: DayOwner }> = ({ date, owner }) => {
  const d = fromIsoDate(date);
  const weekdayLabel = WEEKDAY_LABELS_HE[weekdayIndex(date)];
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-1.5 rounded-sm border text-center',
        owner === 'A' && 'bg-primary/15 border-primary/40',
        owner === 'B' && 'bg-accent/15 border-accent/40',
        owner === 'both' && 'bg-gradient-to-br from-primary/10 to-accent/10 border-muted-foreground/40',
        owner === 'neither' && 'bg-muted/20 border-dashed border-muted-foreground/30',
      )}
    >
      <span className="text-[9px] font-bold leading-none text-muted-foreground">{weekdayLabel}</span>
      <span className="text-[10px] leading-none mt-0.5">{d.getDate()}</span>
    </div>
  );
};

function useIsSmallScreen(breakpoint = 420) {
  const [small, setSmall] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });
  React.useEffect(() => {
    const onResize = () => setSmall(window.innerWidth < breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return small;
}

// Tiny helper — builds a 14-day preview given a pattern-evaluator function.
export function buildRibbonDays(
  startIso: string,
  evaluate: (iso: string) => DayOwner,
): { date: string; owner: DayOwner }[] {
  const out: { date: string; owner: DayOwner }[] = [];
  for (let i = 0; i < 14; i++) {
    const iso = addIsoDays(startIso, i);
    out.push({ date: iso, owner: evaluate(iso) });
  }
  return out;
}
