import React from 'react';
import { ChevronLeft, ChevronRight, Calendar, Download, PartyPopper, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { schoolYearFor, schoolYearLabelHebrew } from '@/lib/hebrewDates';
import { fromIsoDate } from '@/lib/custody/dateUtils';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface CalendarHeaderProps {
  currentMonthStartIso: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onEditSchedule: () => void;
  onLoadHolidays: () => void;
  onExportIcal: () => void;
}

/** D4 — Page header + action bar for the custody calendar. */
export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentMonthStartIso,
  onPrev,
  onNext,
  onToday,
  onEditSchedule,
  onLoadHolidays,
  onExportIcal,
}) => {
  const monthLabel = format(fromIsoDate(currentMonthStartIso), 'LLLL yyyy', { locale: he });
  const hebrewYear = schoolYearLabelHebrew(schoolYearFor(currentMonthStartIso));

  return (
    <div className="space-y-3 mb-4">
      {/* Title row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold">לוח המשמורת — {monthLabel}</h1>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onPrev} aria-label="חודש קודם">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onToday}>
            היום
          </Button>
          <Button variant="ghost" size="icon" onClick={onNext} aria-label="חודש הבא">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onEditSchedule}>
          <Pencil className="ml-2 h-4 w-4" />
          הלו"ז שלי
        </Button>
        <Button variant="outline" size="sm" onClick={onLoadHolidays}>
          <PartyPopper className="ml-2 h-4 w-4" />
          טען חגי {hebrewYear}
        </Button>
        <Button variant="outline" size="sm" onClick={onExportIcal} title="ייצוא ליומן חיצוני">
          <Download className="ml-2 h-4 w-4" />
          iCal
        </Button>
      </div>
    </div>
  );
};
