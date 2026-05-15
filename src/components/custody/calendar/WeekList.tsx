import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ResolvedDay } from '@/integrations/supabase/custodyTypes';
import { formatWeekday } from '@/lib/hebrewDates';
import { fromIsoDate } from '@/lib/custody/dateUtils';

interface WeekListProps {
  resolved: ResolvedDay[];
  partnerName: string | null;
  onSelect: (iso: string) => void;
  selectedDateIso?: string | null;
  isSoloParent: boolean;
}

/** Mobile-first vertical list — one row per day. */
export const WeekList: React.FC<WeekListProps> = ({
  resolved,
  partnerName,
  onSelect,
  selectedDateIso,
  isSoloParent,
}) => {
  return (
    <ul className="divide-y border rounded-lg overflow-hidden" role="list">
      {resolved.map((day) => (
        <WeekRow
          key={day.date}
          day={day}
          partnerName={partnerName}
          isSelected={day.date === selectedDateIso}
          isSoloParent={isSoloParent}
          onClick={() => onSelect(day.date)}
        />
      ))}
    </ul>
  );
};

const WeekRow: React.FC<{
  day: ResolvedDay;
  partnerName: string | null;
  isSelected: boolean;
  isSoloParent: boolean;
  onClick: () => void;
}> = ({ day, partnerName, isSelected, isSoloParent, onClick }) => {
  const d = fromIsoDate(day.date);
  const chipText = ownerLabel(day, partnerName, isSoloParent);

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={isSelected}
        className={cn(
          'w-full flex items-center gap-3 p-3 text-right transition-colors',
          isSelected ? 'bg-muted/40' : 'hover:bg-muted/20',
        )}
      >
        <span className="shrink-0 w-14 text-center">
          <div className="text-[10px] text-muted-foreground">
            {formatWeekday(day.date, { short: true })}
          </div>
          <div className="text-lg font-bold leading-tight">{d.getDate()}</div>
          <div className="text-[10px] text-muted-foreground">/{d.getMonth() + 1}</div>
        </span>
        <span
          aria-hidden
          className={cn(
            'w-1.5 h-12 rounded-full shrink-0',
            day.owner === 'A' && 'bg-primary',
            day.owner === 'B' && 'bg-accent',
            day.owner === 'both' && 'bg-gradient-to-b from-primary to-accent',
            day.owner === 'neither' && 'bg-muted-foreground/30',
          )}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{chipText}</span>
            {day.eventName && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/60 text-secondary-foreground">
                {day.eventName}
              </span>
            )}
            {day.conflict && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive">
                קונפליקט
              </span>
            )}
            {day.auditBadge && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                שונה
              </span>
            )}
          </div>
        </div>
        <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
      </button>
    </li>
  );
};

function ownerLabel(
  day: ResolvedDay,
  partnerName: string | null,
  isSoloParent: boolean,
): string {
  if (day.owner === 'A') return 'אצלי';
  if (day.owner === 'B') {
    if (isSoloParent) return 'לא סומן';
    return `אצל ${partnerName ?? 'ההורה השני'}`;
  }
  if (day.owner === 'both') return 'משותף';
  return 'טרם שובץ';
}
