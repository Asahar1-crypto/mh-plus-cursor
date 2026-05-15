import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCustodyData } from '@/hooks/useCustodyData';
import { useResolvedSchedule } from '@/hooks/useResolvedSchedule';
import { useCustodyProposals } from '@/hooks/useCustodyProposals';
import { useRecentEditedDates } from '@/hooks/useAuditForDates';
import { useLoadHolidays } from '@/hooks/useLoadHolidays';
import { VirtualPartnerRibbon } from '@/components/custody/virtual/VirtualPartnerRibbon';
import { schoolYearFor } from '@/lib/hebrewDates';
import { LoadingState, ErrorState } from '@/components/ui/state-views';
import { CustodyEmptyState } from '@/components/custody/calendar/CustodyEmptyState';
import { CalendarHeader } from '@/components/custody/calendar/CalendarHeader';
import { MonthGrid } from '@/components/custody/calendar/MonthGrid';
import { WeekList } from '@/components/custody/calendar/WeekList';
import { DayDetail } from '@/components/custody/calendar/DayDetail';
import { CustodyLegend } from '@/components/custody/shared/CustodyLegend';
import { ConflictBanner } from '@/components/custody/conflict/ConflictBanner';
import { ConflictSheet } from '@/components/custody/conflict/ConflictSheet';
import { ProposalReviewDialog } from '@/components/custody/conflict/ProposalReviewDialog';
import { SwapRequestSheet } from '@/components/custody/swap/SwapRequestSheet';
import { AuditTimeline } from '@/components/custody/history/AuditTimeline';
import { HistoricalEditConfirm } from '@/components/custody/history/HistoricalEditConfirm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  addDays,
  addIsoDays,
  fromIsoDate,
  toIsoDate,
} from '@/lib/custody/dateUtils';
import { isWithinEditWindow } from '@/integrations/supabase/custodyProposalService';
import type { ResolvedDay } from '@/integrations/supabase/custodyTypes';

const CustodyCalendar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [cursorIso, setCursorIso] = useState<string>(() => {
    const today = new Date();
    return toIsoDate(isMobile ? startOfWeek(today) : startOfMonth(today));
  });

  const [selectedDateIso, setSelectedDateIso] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isConflictSheetOpen, setIsConflictSheetOpen] = useState(false);
  const [isSwapSheetOpen, setIsSwapSheetOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isHistoricalConfirmOpen, setIsHistoricalConfirmOpen] = useState(false);
  const [activeProposalId, setActiveProposalId] = useState<string | null>(null);

  const range = useMemo(() => {
    if (isMobile) {
      return { from: cursorIso, to: addIsoDays(cursorIso, 6) };
    }
    const monthStart = fromIsoDate(cursorIso);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);
    const from = toIsoDate(addDays(monthStart, -monthStart.getDay()));
    const to = toIsoDate(addDays(monthEnd, 6 - monthEnd.getDay()));
    return { from, to };
  }, [cursorIso, isMobile]);

  const { data, isLoading, error, refetch } = useCustodyData({
    rangeFromIso: range.from,
    rangeToIso: range.to,
  });

  const { data: recentEditedDates } = useRecentEditedDates();
  const { data: proposals } = useCustodyProposals();

  const resolved = useResolvedSchedule({
    data,
    rangeFromIso: range.from,
    rangeToIso: range.to,
    recentlyEditedDates: recentEditedDates,
  });

  const selectedDay: ResolvedDay | null = useMemo(
    () => resolved.find((d) => d.date === selectedDateIso) ?? null,
    [resolved, selectedDateIso],
  );

  const conflictDates = useMemo(
    () => resolved.filter((d) => d.conflict).map((d) => d.date),
    [resolved],
  );

  const pendingForMe = useMemo(() => {
    if (!proposals || !user) return [];
    return proposals.filter((p) => p.recipient_id === user.id);
  }, [proposals, user]);

  const activeProposal = useMemo(() => {
    if (!activeProposalId || !proposals) return null;
    return proposals.find((p) => p.id === activeProposalId) ?? null;
  }, [activeProposalId, proposals]);

  const handleSelectDate = useCallback((iso: string) => {
    setSelectedDateIso(iso);
    setIsDetailOpen(true);
  }, []);

  const handleNav = useCallback(
    (direction: -1 | 1) => {
      if (isMobile) {
        setCursorIso((cur) => addIsoDays(cur, direction * 7));
      } else {
        const d = fromIsoDate(cursorIso);
        d.setMonth(d.getMonth() + direction);
        setCursorIso(toIsoDate(startOfMonth(d)));
      }
    },
    [cursorIso, isMobile],
  );

  const handleToday = useCallback(() => {
    const today = new Date();
    setCursorIso(toIsoDate(isMobile ? startOfWeek(today) : startOfMonth(today)));
  }, [isMobile]);

  const goEditSchedule = useCallback(() => {
    navigate('/account-settings?tab=account&editCustody=1#custody');
  }, [navigate]);

  const loadHolidaysForYear = useLoadHolidays();
  const loadHolidays = useCallback(() => {
    const schoolYear = schoolYearFor(cursorIso);
    loadHolidaysForYear(schoolYear);
  }, [cursorIso, loadHolidaysForYear]);

  const exportIcal = useCallback(() => {
    if (!data) return;
    const ics = generateIcal(resolved, data.partnerName);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'custody-calendar.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [data, resolved]);

  const openFirstConflict = useCallback(() => {
    if (conflictDates.length === 0) return;
    setSelectedDateIso(conflictDates[0]);
    setIsDetailOpen(false);
    setIsConflictSheetOpen(true);
  }, [conflictDates]);

  const handleRequestSwap = useCallback(() => {
    setIsDetailOpen(false);
    setIsSwapSheetOpen(true);
  }, []);

  const handleEditException = useCallback(() => {
    if (!selectedDateIso) return;
    const withinWindow = isWithinEditWindow(selectedDateIso);
    if (!withinWindow) {
      toast.error('עריכה מעל 30 יום אחורה חסומה.');
      return;
    }
    const isPast = selectedDateIso < toIsoDate(new Date());
    if (isPast) {
      setIsDetailOpen(false);
      setIsHistoricalConfirmOpen(true);
      return;
    }
    toast.info('עריכת חריגה תגיע בהמשך');
  }, [selectedDateIso]);

  const handleViewAudit = useCallback(() => {
    setIsDetailOpen(false);
    setIsAuditOpen(true);
  }, []);

  if (!user) {
    return <ErrorState message="אין אפשרות לטעון את הלוח — יש להתחבר מחדש" />;
  }

  if (isLoading && !data) {
    return <LoadingState text="טוען לוח משמורת..." fullPage />;
  }

  if (error) {
    return <ErrorState message="שגיאה בטעינת הלוח" onRetry={() => refetch()} />;
  }

  if (!data) return null;

  const hasPattern = data.myPattern !== null || data.partnerPattern !== null;

  return (
    <div className="container mx-auto max-w-7xl py-4 sm:py-6 px-3 sm:px-4" dir="rtl">
      <CalendarHeader
        currentMonthStartIso={
          isMobile ? toIsoDate(startOfMonth(fromIsoDate(cursorIso))) : cursorIso
        }
        onPrev={() => handleNav(-1)}
        onNext={() => handleNav(1)}
        onToday={handleToday}
        onEditSchedule={goEditSchedule}
        onLoadHolidays={loadHolidays}
        onExportIcal={exportIcal}
      />

      {/* Virtual partner ribbon */}
      {data.partnerName && !data.partnerUserId && (
        <VirtualPartnerRibbon partnerName={data.partnerName} />
      )}

      {/* Pending proposals for me */}
      {pendingForMe.length > 0 && (
        <div className="mb-3 space-y-2">
          {pendingForMe.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActiveProposalId(p.id)}
              className="w-full text-right p-3 rounded-lg border-2 border-primary/50 bg-primary/5 hover:bg-primary/10 transition"
            >
              <p className="text-xs text-muted-foreground">הצעה ממתינה:</p>
              <p className="text-sm font-semibold">
                {p.kind === 'swap' ? 'בקשת החלפת יום' : 'פתרון התנגשות'}
              </p>
            </button>
          ))}
        </div>
      )}

      {!data.isSoloParent && (
        <ConflictBanner
          conflictCount={conflictDates.length}
          onResolve={openFirstConflict}
        />
      )}

      {!hasPattern && !data.isSoloParent ? (
        <CustodyEmptyState onSetup={goEditSchedule} onLoadHolidaysOnly={loadHolidays} />
      ) : (
        <>
          <CustodyLegend
            meLabel="אצלי"
            otherLabel={
              data.isSoloParent ? '—' : `אצל ${data.partnerName ?? 'ההורה השני'}`
            }
            showShared={!data.isSoloParent}
            showNeither
            className="mb-3"
          />

          {isMobile ? (
            <>
              <p className="text-xs text-muted-foreground text-center mb-2">
                שבוע {formatRangeLabel(range.from, range.to)}
              </p>
              <WeekList
                resolved={resolved}
                partnerName={data.partnerName}
                onSelect={handleSelectDate}
                selectedDateIso={selectedDateIso}
                isSoloParent={data.isSoloParent}
              />
            </>
          ) : (
            <MonthGrid
              monthStartIso={cursorIso}
              resolved={resolved}
              selectedDateIso={selectedDateIso}
              onSelect={handleSelectDate}
            />
          )}
        </>
      )}

      {/* Day detail */}
      {isMobile ? (
        <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
            <SheetHeader className="sr-only">
              <SheetTitle>פרטי היום</SheetTitle>
            </SheetHeader>
            <DayDetailContent
              day={selectedDay}
              data={data}
              onRequestSwap={handleRequestSwap}
              onEditException={handleEditException}
              onViewAudit={handleViewAudit}
            />
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-sm p-0">
            <DialogHeader className="sr-only">
              <DialogTitle>פרטי היום</DialogTitle>
            </DialogHeader>
            <DayDetailContent
              day={selectedDay}
              data={data}
              onRequestSwap={handleRequestSwap}
              onEditException={handleEditException}
              onViewAudit={handleViewAudit}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Conflict resolution sheet */}
      <ConflictSheet
        open={isConflictSheetOpen}
        onOpenChange={setIsConflictSheetOpen}
        conflictDay={selectedDay}
        partnerUserId={data.partnerUserId}
        partnerName={data.partnerName}
        myName={null}
      />

      {/* Swap request sheet */}
      <SwapRequestSheet
        open={isSwapSheetOpen}
        onOpenChange={setIsSwapSheetOpen}
        fromDateIso={selectedDateIso}
        partnerUserId={data.partnerUserId}
        partnerName={data.partnerName}
      />

      {/* Audit timeline */}
      <AuditTimeline
        open={isAuditOpen}
        onOpenChange={setIsAuditOpen}
        eventDateIso={selectedDateIso}
      />

      {/* Historical edit confirm */}
      <HistoricalEditConfirm
        open={isHistoricalConfirmOpen}
        onOpenChange={setIsHistoricalConfirmOpen}
        dateIso={selectedDateIso}
        partnerName={data.partnerName}
        onConfirm={() => {
          setIsHistoricalConfirmOpen(false);
          toast.info('עריכת חריגה בפועל תגיע בגרסה הבאה');
        }}
      />

      {/* Proposal review for pending proposals */}
      <ProposalReviewDialog
        proposal={activeProposal}
        proposerName={data.partnerName}
        open={activeProposal !== null}
        onOpenChange={(open) => !open && setActiveProposalId(null)}
      />
    </div>
  );
};

function DayDetailContent({
  day,
  data,
  onRequestSwap,
  onEditException,
  onViewAudit,
}: {
  day: ResolvedDay | null;
  data: ReturnType<typeof useCustodyData>['data'];
  onRequestSwap: () => void;
  onEditException: () => void;
  onViewAudit: () => void;
}) {
  if (!data || !day) return null;
  const isWithin30 = isWithinEditWindow(day.date);
  return (
    <DayDetail
      day={day}
      partnerName={data.partnerName}
      isSoloParent={data.isSoloParent}
      isEditable
      isWithin30Days={isWithin30}
      onRequestSwap={onRequestSwap}
      onEditException={onEditException}
      onViewAudit={day.auditBadge ? onViewAudit : undefined}
    />
  );
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfWeek(d: Date): Date {
  return addDays(d, -d.getDay());
}

function formatRangeLabel(fromIso: string, toIso: string): string {
  const a = fromIsoDate(fromIso);
  const b = fromIsoDate(toIso);
  return `${a.getDate()}.${a.getMonth() + 1} – ${b.getDate()}.${b.getMonth() + 1}`;
}

function generateIcal(resolved: ResolvedDay[], partnerName: string | null): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Family Finance Plus//Custody Calendar//HE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  for (const d of resolved) {
    if (d.owner === 'neither') continue;
    const ownerName =
      d.owner === 'A'
        ? 'אצלי'
        : d.owner === 'B'
          ? `אצל ${partnerName ?? 'ההורה השני'}`
          : 'משותף';
    const startStr = d.date.replace(/-/g, '');
    const end = addIsoDays(d.date, 1);
    const endStr = end.replace(/-/g, '');
    const summary = escapeIcs(
      `${ownerName}${d.eventName ? ` · ${d.eventName}` : ''}`,
    );
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:custody-${d.date}@family-finance-plus`);
    lines.push(`DTSTART;VALUE=DATE:${startStr}`);
    lines.push(`DTEND;VALUE=DATE:${endStr}`);
    lines.push(`SUMMARY:${summary}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function escapeIcs(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n');
}

export default CustodyCalendar;
