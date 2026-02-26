import React, { useState, useMemo } from 'react';
import { CalendarDays, Download } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useCustodyAssignments } from '@/hooks/useCustodyAssignments';
import LoadHolidaysButton from '@/components/custody/LoadHolidaysButton';
import LoadVacationsButton from '@/components/custody/LoadVacationsButton';
import CustodyTable from '@/components/custody/CustodyTable';
import CustodyFilters, { CustodyFilterState } from '@/components/custody/CustodyFilters';
import CustodySummary from '@/components/custody/CustodySummary';
import EmptyCustodyState from '@/components/custody/EmptyCustodyState';
import { Button } from '@/components/ui/button';

const CustodyCalendar: React.FC = () => {
  const { user, account } = useAuth();
  const {
    assignments,
    isLoading,
    isFetchingAI,
    members,
    fetchHolidays,
    fetchVacations,
    assignParent,
    updateNotes,
    deleteAssignment,
    bulkAssignParent,
  } = useCustodyAssignments();

  const [filters, setFilters] = useState<CustodyFilterState>({
    eventType: 'all',
    parentFilter: 'all',
  });

  const generateAndDownloadICal = () => {
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Family Finance Plus//Custody Calendar//HE',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    assignments.forEach((a) => {
      const startStr = a.start_date.replace(/-/g, '');
      const endDate = new Date(a.end_date);
      endDate.setDate(endDate.getDate() + 1);
      const endStr = endDate.toISOString().split('T')[0].replace(/-/g, '');
      const parentName = members.find(m => m.user_id === a.assigned_parent_id)?.user_name || '';

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${a.id}@family-finance-plus`);
      lines.push(`DTSTART;VALUE=DATE:${startStr}`);
      lines.push(`DTEND;VALUE=DATE:${endStr}`);
      lines.push(`SUMMARY:${a.event_name}${parentName ? ` (${parentName})` : ''}`);
      if (a.notes) lines.push(`DESCRIPTION:${a.notes.replace(/\n/g, '\\n')}`);
      lines.push('END:VEVENT');
    });

    lines.push('END:VCALENDAR');

    const content = lines.join('\r\n');
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'custody-calendar.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (filters.eventType !== 'all' && a.event_type !== filters.eventType) return false;
      if (filters.parentFilter === 'unassigned' && a.assigned_parent_id) return false;
      if (filters.parentFilter !== 'all' && filters.parentFilter !== 'unassigned' && a.assigned_parent_id !== filters.parentFilter) return false;
      return true;
    });
  }, [assignments, filters]);

  if (!user || !account) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p>טוען נתונים...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p>טוען נתוני משמורת...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 animate-fade-in">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-72 h-72 sm:w-96 sm:h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 sm:w-96 sm:h-96 bg-accent/5 rounded-full blur-3xl animate-pulse [animation-delay:2s]" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 py-3 sm:py-6 space-y-3 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-3 animate-fade-in">
          <div className="p-2 sm:p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl backdrop-blur-sm border border-primary/20">
            <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent truncate">
              לוח חופשות ומשמורת
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{account.name}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 sm:space-y-0 sm:flex sm:flex-row sm:items-center sm:gap-3 p-3 sm:p-4 bg-card rounded-xl border shadow-sm">
          <LoadHolidaysButton onLoad={fetchHolidays} isLoading={isFetchingAI} />
          <div className="hidden sm:block w-px h-8 bg-border flex-shrink-0" />
          <div className="border-t sm:hidden border-border" />
          <LoadVacationsButton onLoad={fetchVacations} isLoading={isFetchingAI} />
          {assignments.length > 0 && (
            <>
              <div className="hidden sm:block w-px h-8 bg-border flex-shrink-0" />
              <div className="border-t sm:hidden border-border" />
              <Button
                variant="outline"
                size="sm"
                onClick={generateAndDownloadICal}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <Download className="h-4 w-4" />
                ייצוא ל-iCal
              </Button>
            </>
          )}
        </div>

        {/* Summary */}
        {assignments.length > 0 && (
          <CustodySummary assignments={assignments} members={members} />
        )}

        {/* Filters */}
        {assignments.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
            <CustodyFilters filters={filters} onChange={setFilters} members={members} />
            <span className="text-xs sm:text-sm text-muted-foreground">
              {filteredAssignments.length} מתוך {assignments.length} אירועים
            </span>
          </div>
        )}

        {/* Table or Empty State */}
        {assignments.length === 0 ? (
          <EmptyCustodyState />
        ) : (
          <CustodyTable
            assignments={filteredAssignments}
            members={members}
            onAssignParent={assignParent}
            onUpdateNotes={updateNotes}
            onDelete={deleteAssignment}
            onBulkAssign={bulkAssignParent}
          />
        )}
      </div>
    </div>
  );
};

export default CustodyCalendar;
