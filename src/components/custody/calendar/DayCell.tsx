import React from 'react';
import { cn } from '@/lib/utils';
import { GraduationCap, PartyPopper, AlertCircle } from 'lucide-react';
import type { ResolvedDay } from '@/integrations/supabase/custodyTypes';
import { fromIsoDate } from '@/lib/custody/dateUtils';

interface DayCellProps {
  day: ResolvedDay;
  isToday?: boolean;
  isSelected?: boolean;
  /** When true, cell is out of the current month (faded in month grid). */
  isOutsideMonth?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Core month-grid cell. Renders:
 *  - day-of-month number
 *  - color background per DayOwner
 *  - event icons (holiday, vacation, conflict, audit-badge)
 *  - selection / today rings
 */
export const DayCell: React.FC<DayCellProps> = ({
  day,
  isToday,
  isSelected,
  isOutsideMonth,
  onClick,
  className,
}) => {
  const dom = fromIsoDate(day.date).getDate();

  const ownerClasses =
    day.owner === 'A'
      ? 'bg-primary/10 border-r-4 border-primary'
      : day.owner === 'B'
        ? 'bg-accent/10 border-r-4 border-accent'
        : day.owner === 'both'
          ? 'bg-gradient-to-br from-primary/15 to-accent/15 border border-muted-foreground/30'
          : 'border border-dashed border-muted-foreground/30 bg-muted/10';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={buildAriaLabel(day)}
      className={cn(
        'relative flex flex-col items-start justify-between h-16 sm:h-20 p-1 sm:p-1.5 rounded-md text-right transition-all duration-200',
        'hover:shadow-md hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        ownerClasses,
        day.conflict && 'ring-2 ring-destructive/60',
        isToday && !isSelected && 'ring-2 ring-foreground/30',
        isSelected && 'ring-2 ring-primary',
        isOutsideMonth && 'opacity-40',
        className,
      )}
    >
      {/* Badges row (top-right) */}
      <div className="flex items-center justify-between w-full">
        <span className="flex items-center gap-1">
          {day.auditBadge && (
            <span
              title="שונה לאחרונה"
              className="inline-flex items-center text-[9px] font-semibold px-1 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
            >
              שונה
            </span>
          )}
        </span>
        <span className={cn('text-xs sm:text-sm font-semibold', day.conflict && 'text-destructive')}>
          {dom}
        </span>
      </div>

      {/* Event icons row (bottom-right) */}
      <div className="flex items-center gap-1 self-end">
        {day.exceptionKind === 'holiday' && <PartyPopper className="w-3 h-3 text-muted-foreground" aria-hidden />}
        {day.exceptionKind === 'vacation' && <GraduationCap className="w-3 h-3 text-muted-foreground" aria-hidden />}
        {day.conflict && <AlertCircle className="w-3 h-3 text-destructive" aria-hidden />}
      </div>
    </button>
  );
};

function buildAriaLabel(day: ResolvedDay): string {
  const ownerText =
    day.owner === 'A'
      ? 'אצלי'
      : day.owner === 'B'
        ? 'אצל ההורה השני'
        : day.owner === 'both'
          ? 'משותף'
          : 'לא סומן';
  const parts = [day.date, ownerText];
  if (day.eventName) parts.push(day.eventName);
  if (day.conflict) parts.push('קונפליקט');
  return parts.join(', ');
}
