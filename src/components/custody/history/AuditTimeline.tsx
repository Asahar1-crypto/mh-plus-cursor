import React, { useMemo } from 'react';
import { History, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuditForDate } from '@/hooks/useAuditForDates';
import type { CustodyAuditRow } from '@/integrations/supabase/custodyTypes';
import { formatDayLong } from '@/lib/hebrewDates';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface AuditTimelineProps {
  eventDateIso: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACTION_LABELS: Record<string, string> = {
  insert: 'נוצר',
  update: 'עודכן',
  delete: 'נמחק',
};

/** F5 / G2 — Audit timeline dialog for a single date. */
export const AuditTimeline: React.FC<AuditTimelineProps> = ({
  eventDateIso,
  open,
  onOpenChange,
}) => {
  const { data: entries, isLoading } = useAuditForDate(eventDateIso);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-right flex items-center gap-2">
            <History className="w-4 h-4" />
            היסטוריה — {eventDateIso ? formatDayLong(eventDateIso) : ''}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">טוען...</div>
        ) : !entries || entries.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            אין רשומות היסטוריה ליום הזה.
          </div>
        ) : (
          <ol className="space-y-3 max-h-[60vh] overflow-y-auto">
            {entries.map((entry, index) => (
              <TimelineRow key={entry.id} entry={entry} isFirst={index === 0} />
            ))}
          </ol>
        )}

        <div className="flex justify-end pt-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 ml-1" />
            סגור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const TimelineRow: React.FC<{ entry: CustodyAuditRow; isFirst: boolean }> = ({
  entry,
  isFirst,
}) => {
  const actionLabel = ACTION_LABELS[entry.action] ?? entry.action;
  const summary = useMemo(() => describeDiff(entry), [entry]);

  return (
    <li className="flex gap-3 text-right">
      <span
        className={cn(
          'w-2 h-2 rounded-full mt-1.5 shrink-0',
          isFirst ? 'bg-primary' : 'bg-muted-foreground/40',
        )}
        aria-hidden
      />
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">
          {format(new Date(entry.created_at), 'dd.MM.yyyy · HH:mm', { locale: he })}
          {' · '}
          <span className="font-semibold">{actionLabel}</span>
        </p>
        {summary && <p className="text-sm mt-0.5">{summary}</p>}
      </div>
    </li>
  );
};

function describeDiff(entry: CustodyAuditRow): string | null {
  if (!entry.diff || typeof entry.diff !== 'object') return null;
  const d = entry.diff as { before?: Record<string, unknown>; after?: Record<string, unknown> };
  const before = d.before ?? null;
  const after = d.after ?? null;

  if (entry.action === 'insert' && after) {
    const name = typeof after.event_name === 'string' ? after.event_name : null;
    return name ? `נוצר: ${name}` : 'נוצרה רשומה חדשה';
  }
  if (entry.action === 'delete' && before) {
    const name = typeof before.event_name === 'string' ? before.event_name : null;
    return name ? `נמחק: ${name}` : 'רשומה נמחקה';
  }
  if (entry.action === 'update' && before && after) {
    const changes: string[] = [];
    if (before.claimed_by !== after.claimed_by) {
      changes.push('שויך הורה אחר');
    }
    if (before.notes !== after.notes) {
      changes.push('הערה עודכנה');
    }
    if (before.start_date !== after.start_date || before.end_date !== after.end_date) {
      changes.push('תאריכים שונו');
    }
    if (changes.length === 0) return 'עריכה';
    return changes.join(' · ');
  }
  return null;
}
