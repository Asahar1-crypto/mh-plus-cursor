import React from 'react';
import {
  User,
  Clock,
  PartyPopper,
  GraduationCap,
  AlertCircle,
  RefreshCw,
  Pencil,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ResolvedDay } from '@/integrations/supabase/custodyTypes';
import { formatDayLong } from '@/lib/hebrewDates';
import { cn } from '@/lib/utils';

interface DayDetailProps {
  day: ResolvedDay | null;
  partnerName: string | null;
  isSoloParent: boolean;
  isEditable: boolean;
  isWithin30Days: boolean;
  onRequestSwap?: () => void;
  onEditException?: () => void;
  onViewAudit?: () => void;
}

/** D3 — Day detail content. Parent owns the popover/sheet wrapper. */
export const DayDetail: React.FC<DayDetailProps> = ({
  day,
  partnerName,
  isSoloParent,
  isEditable,
  isWithin30Days,
  onRequestSwap,
  onEditException,
  onViewAudit,
}) => {
  if (!day) {
    return (
      <div className="p-4 text-sm text-muted-foreground">טוען...</div>
    );
  }

  const ownerText = ownerLine(day, partnerName, isSoloParent);
  const kindText = day.exceptionKind
    ? day.exceptionKind === 'holiday'
      ? 'חג'
      : day.exceptionKind === 'vacation'
        ? 'חופשה בית-ספר'
        : day.exceptionKind === 'irregular' as never
          ? 'יום מיוחד'
          : null
    : null;

  return (
    <div
      role="dialog"
      aria-labelledby="day-detail-title"
      className="p-4 space-y-4 text-right"
    >
      <div>
        <h3 id="day-detail-title" className="text-base font-bold">
          {formatDayLong(day.date)}
        </h3>
      </div>

      {/* Conflict alert takes priority */}
      {day.conflict && !isSoloParent && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {partnerName ?? 'ההורה השני'} רשום/ה באותו יום.{' '}
            <button type="button" className="underline font-semibold" onClick={onRequestSwap}>
              לפתור קונפליקט
            </button>
          </AlertDescription>
        </Alert>
      )}

      <InfoRow icon={<User className="h-4 w-4" />} text={ownerText} />

      {day.exceptionKind === null && !day.conflict && day.owner !== 'neither' && (
        <InfoRow icon={<Clock className="h-4 w-4" />} text="העברה: 18:00" muted />
      )}

      {kindText && day.eventName && (
        <InfoRow
          icon={
            day.exceptionKind === 'holiday' ? (
              <PartyPopper className="h-4 w-4" />
            ) : (
              <GraduationCap className="h-4 w-4" />
            )
          }
          text={`${day.eventName} (${kindText})`}
        />
      )}

      {/* Actions */}
      <div className="border-t pt-3 flex flex-col gap-2">
        {!isSoloParent && onRequestSwap && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRequestSwap}
            disabled={!isEditable || !isWithin30Days}
          >
            <RefreshCw className="ml-2 h-4 w-4" />
            בקש החלפה
          </Button>
        )}
        {onEditException && (
          <Button
            variant="outline"
            size="sm"
            onClick={onEditException}
            disabled={!isEditable || !isWithin30Days}
          >
            <Pencil className="ml-2 h-4 w-4" />
            חריגה ליום
          </Button>
        )}
        {!isWithin30Days && (
          <p className="text-[11px] text-muted-foreground">
            לא ניתן לערוך תאריכים ישנים מ-30 יום
          </p>
        )}
        {day.auditBadge && onViewAudit && (
          <Button variant="ghost" size="sm" onClick={onViewAudit}>
            <History className="ml-2 h-4 w-4" />
            ראה היסטוריית שינויים
          </Button>
        )}
      </div>
    </div>
  );
};

const InfoRow: React.FC<{
  icon: React.ReactNode;
  text: string;
  muted?: boolean;
}> = ({ icon, text, muted }) => (
  <div className={cn('flex items-center gap-2 text-sm', muted && 'text-muted-foreground')}>
    <span aria-hidden>{icon}</span>
    <span>{text}</span>
  </div>
);

function ownerLine(
  day: ResolvedDay,
  partnerName: string | null,
  isSoloParent: boolean,
): string {
  if (day.owner === 'A') return 'אצלי';
  if (day.owner === 'B') {
    if (isSoloParent) return 'טרם שובץ';
    return `אצל ${partnerName ?? 'ההורה השני'}`;
  }
  if (day.owner === 'both') {
    return `משותף${partnerName ? ` — אני ו-${partnerName}` : ''}`;
  }
  return 'טרם שובץ';
}
