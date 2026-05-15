import React, { useMemo } from 'react';
import { DayCell } from './DayCell';
import { fromIsoDate, toIsoDate, enumerateDates, addDays } from '@/lib/custody/dateUtils';
import type { ResolvedDay } from '@/integrations/supabase/custodyTypes';
import { WEEKDAY_LABELS_HE } from '@/integrations/supabase/custodyTypes';

interface MonthGridProps {
  /** First day of the month to render, as YYYY-MM-DD. */
  monthStartIso: string;
  resolved: ResolvedDay[];
  selectedDateIso?: string | null;
  onSelect: (iso: string) => void;
}

/**
 * Desktop month grid. The `resolved` prop must cover the full visible range
 * (month padded to Sunday–Saturday boundaries). Cells outside the month fade.
 */
export const MonthGrid: React.FC<MonthGridProps> = ({
  monthStartIso,
  resolved,
  selectedDateIso,
  onSelect,
}) => {
  const today = useMemo(() => toIsoDate(new Date()), []);

  const monthStart = useMemo(() => fromIsoDate(monthStartIso), [monthStartIso]);
  const monthEnd = useMemo(() => {
    const d = new Date(monthStart);
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d;
  }, [monthStart]);

  const gridStart = useMemo(() => {
    return addDays(monthStart, -monthStart.getDay());
  }, [monthStart]);

  const gridEnd = useMemo(() => {
    const daysAfter = 6 - monthEnd.getDay();
    return addDays(monthEnd, daysAfter);
  }, [monthEnd]);

  const visibleDates = useMemo(
    () => enumerateDates(toIsoDate(gridStart), toIsoDate(gridEnd)),
    [gridStart, gridEnd],
  );

  const byDate = useMemo(() => {
    const m = new Map<string, ResolvedDay>();
    for (const r of resolved) m.set(r.date, r);
    return m;
  }, [resolved]);

  return (
    <div className="w-full" role="grid" aria-label="לוח חודשי">
      {/* Weekday header row */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2" role="row">
        {WEEKDAY_LABELS_HE.map((label) => (
          <div
            key={label}
            role="columnheader"
            className="text-xs sm:text-sm font-semibold text-center text-muted-foreground py-1"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {visibleDates.map((iso) => {
          const d = byDate.get(iso);
          if (!d) {
            // Placeholder (should not normally happen — resolver covers full range)
            return (
              <div
                key={iso}
                className="h-16 sm:h-20 rounded-md bg-muted/10 border border-dashed border-muted-foreground/20"
              />
            );
          }
          const isOutsideMonth =
            fromIsoDate(iso).getMonth() !== monthStart.getMonth();
          return (
            <DayCell
              key={iso}
              day={d}
              isToday={iso === today}
              isSelected={iso === selectedDateIso}
              isOutsideMonth={isOutsideMonth}
              onClick={() => onSelect(iso)}
            />
          );
        })}
      </div>
    </div>
  );
};
