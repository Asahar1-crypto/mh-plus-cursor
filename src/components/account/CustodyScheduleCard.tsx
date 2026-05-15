import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar, ChevronDown, ChevronUp, Pencil, Eye, Sparkles } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CustodyLegend } from '@/components/custody/shared/CustodyLegend';
import { FourteenDayRibbon, buildRibbonDays } from '@/components/custody/shared/FourteenDayRibbon';
import { CustodyEditSheet } from '@/components/custody/settings/CustodyEditSheet';
import { PRESET_CATALOG } from '@/lib/custody/presets';
import { fromIsoDate, toIsoDate, addIsoDays } from '@/lib/custody/dateUtils';
import { useCustodyData } from '@/hooks/useCustodyData';
import { useResolvedSchedule } from '@/hooks/useResolvedSchedule';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';

/** C1/C2 — Settings page card for the custody schedule. */
export const CustodyScheduleCard: React.FC = () => {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const autoOpenedRef = useRef(false);

  // Auto-open edit sheet when navigated here with ?editCustody=1 (e.g. from
  // CustodyCalendar's "Setup your schedule" CTA). Clear the param so that
  // refreshing the page doesn't re-open the sheet.
  useEffect(() => {
    if (autoOpenedRef.current) return;
    if (searchParams.get('editCustody') === '1') {
      autoOpenedRef.current = true;
      setExpanded(true);
      setEditing(true);
      const next = new URLSearchParams(searchParams);
      next.delete('editCustody');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const today = useMemo(() => toIsoDate(new Date()), []);
  const rangeTo = useMemo(() => addIsoDays(today, 28), [today]);

  const { data, isLoading } = useCustodyData({
    rangeFromIso: today,
    rangeToIso: rangeTo,
  });

  const resolved = useResolvedSchedule({
    data,
    rangeFromIso: today,
    rangeToIso: rangeTo,
  });

  const preview14 = useMemo(() => {
    return buildRibbonDays(today, (iso) => {
      const found = resolved.find((r) => r.date === iso);
      return found?.owner ?? 'neither';
    });
  }, [today, resolved]);

  if (isLoading) {
    return (
      <Card className="p-4 space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-full" />
      </Card>
    );
  }

  const myPattern = data?.myPattern;
  const summaryLine = myPattern
    ? buildSummary(myPattern.preset_key, myPattern.handoff_time, data?.isSoloParent ?? false)
    : null;

  return (
    <>
      <Card className="overflow-hidden">
        {/* C1 — Collapsed / header row */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            'w-full flex items-center justify-between gap-3 p-4 text-right transition-colors',
            'hover:bg-muted/20',
          )}
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0 text-right">
              <h3 className="text-sm font-bold leading-tight">הלו"ז שלי</h3>
              <p className="text-xs text-muted-foreground truncate">
                {summaryLine ?? 'עדיין לא הגדרת לו"ז'}
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            ערוך
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </span>
        </button>

        {/* C2 — Expanded content */}
        {expanded && (
          <div className="border-t p-4 space-y-4 animate-in slide-in-from-top duration-200">
            {myPattern ? (
              <>
                <CustodyLegend
                  meLabel="אצלי"
                  otherLabel={
                    data?.isSoloParent ? '—' : `אצל ${data?.partnerName ?? 'ההורה השני'}`
                  }
                  showShared={!data?.isSoloParent}
                  showNeither
                />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">השבועיים הקרובים:</p>
                  <FourteenDayRibbon days={preview14} startIso={today} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setEditing(true)}>
                    <Pencil className="ml-2 h-3 w-3" />
                    ערוך את הלו"ז שלי
                  </Button>
                  {!data?.isSoloParent && data?.partnerPattern && (
                    <Button size="sm" variant="outline" disabled title="יגיע בגרסה הבאה">
                      <Eye className="ml-2 h-3 w-3" />
                      הלו"ז של {data?.partnerName ?? 'ההורה השני'}
                    </Button>
                  )}
                </div>
                {myPattern.updated_at && (
                  <p className="text-[11px] text-muted-foreground border-t pt-2">
                    עודכן לאחרונה:{' '}
                    {format(new Date(myPattern.updated_at), 'dd.MM.yyyy', { locale: he })}
                  </p>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">עדיין לא הגדרת לו"ז</p>
                <Button onClick={() => setEditing(true)}>
                  <Sparkles className="ml-2 h-4 w-4" />
                  הגדר עכשיו
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      <CustodyEditSheet
        open={editing}
        onOpenChange={setEditing}
        initialPattern={myPattern ?? null}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['custody-data'] });
        }}
      />
    </>
  );
};

function buildSummary(presetKey: string, handoffTime: string, isSolo: boolean): string {
  const preset = PRESET_CATALOG[presetKey as keyof typeof PRESET_CATALOG];
  const label = preset?.labelHe ?? 'תבנית מותאמת';
  const handoff = handoffTime.slice(0, 5);
  return isSolo ? `${label} · ${handoff}` : `${label} · החלפה ב-${handoff}`;
}

// Silence unused-export warning from fromIsoDate when code-split.
void fromIsoDate;
