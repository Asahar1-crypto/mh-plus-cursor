import React, { useMemo, useState } from 'react';
import { Hand, Check, Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { custodyPatternService } from '@/integrations/supabase/custodyService';
import { PRESET_CATALOG } from '@/lib/custody/presets';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CustodyLegend } from '../shared/CustodyLegend';
import { FourteenDayRibbon, buildRibbonDays } from '../shared/FourteenDayRibbon';
import { addIsoDays, toIsoDate, weekdayIndex, biWeeklyPhase } from '@/lib/custody/dateUtils';
import { CustodyEditSheet } from '../settings/CustodyEditSheet';
import type { CustodyPatternRow, DayOwner } from '@/integrations/supabase/custodyTypes';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { fromIsoDate } from '@/lib/custody/dateUtils';
import { maskHasDay } from '@/lib/custody/presets';

/**
 * H3 — Non-dismissible consent modal shown to a partner the first time they
 * sign up and discover that the other parent has already built a schedule
 * "on their behalf" (acts_as = this user's profile id).
 *
 * Two ways out:
 *   - Approve as-is → claim the pattern (acts_as cleared, inviter gets toast)
 *   - Edit → open C3 drawer; saving inside the drawer also counts as consent.
 */
export const VirtualPartnerConsentWall: React.FC = () => {
  const { user, account, profile } = useAuth();
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);

  const { data: inheritedPattern, isLoading } = useQuery<CustodyPatternRow | null>({
    queryKey: ['inherited-custody-pattern', account?.id, user?.id],
    enabled: Boolean(account?.id && user?.id),
    queryFn: async () => {
      if (!account?.id || !user?.id) return null;
      const { data, error } = await supabase
        .from('custody_patterns')
        .select('*')
        .eq('account_id', account.id)
        .eq('acts_as', user.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as CustodyPatternRow | null;
    },
  });

  const todayIso = toIsoDate(new Date());
  const ribbonDays = useMemo(() => {
    if (!inheritedPattern) return [];
    return buildRibbonDays(todayIso, (iso) => evaluateDay(iso, inheritedPattern));
  }, [inheritedPattern, todayIso]);

  const preset = inheritedPattern ? PRESET_CATALOG[inheritedPattern.preset_key] : null;
  const inviterName =
    account?.virtual_partner_name && profile?.name !== account?.virtual_partner_name
      ? 'ההורה השני'
      : 'ההורה השני';

  // If there's no inherited pattern (user isn't a virtual partner), render nothing.
  if (!user || !account) return null;
  if (!isLoading && !inheritedPattern) return null;

  const handleConfirm = async () => {
    if (!inheritedPattern || !user?.id || !account?.id) return;
    setConfirming(true);
    try {
      await custodyPatternService.upsert({
        accountId: account.id,
        ownerUserId: user.id,
        presetKey: inheritedPattern.preset_key,
        weekdayMaskWeek1: inheritedPattern.weekday_mask_week1,
        weekdayMaskWeek2: inheritedPattern.weekday_mask_week2,
        dtstart: inheritedPattern.dtstart,
        handoffTime: inheritedPattern.handoff_time,
        actsAs: null,
      });
      // Clear virtual_partner_name if it matches this user (they've joined)
      if (account.virtual_partner_name && profile?.name) {
        await supabase
          .from('accounts')
          .update({ virtual_partner_name: null })
          .eq('id', account.id);
      }
      toast.success('אישרת. הלו"ז שלך מוכן.');
      qc.invalidateQueries({ queryKey: ['inherited-custody-pattern'] });
      qc.invalidateQueries({ queryKey: ['custody-data'] });
    } catch (err) {
      console.error('Consent confirm failed:', err);
      toast.error('לא הצלחנו לאשר. נסו שוב.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <>
      <Dialog open={inheritedPattern !== null && !editing} onOpenChange={() => {}}>
        <DialogContent
          className="max-w-lg text-right"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {isLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">טוען לו"ז...</p>
            </div>
          ) : inheritedPattern && preset ? (
            <div className="space-y-4">
              <div className="text-center space-y-2 pt-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-1">
                  <Hand className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-xl font-bold">
                  ברוכה הבאה{profile?.name ? `, ${profile.name}` : ''}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {inviterName} הכין/ה עבורך לו"ז ראשוני. אישור השהייה אצלך יעזור לכם להתחיל.
                </p>
              </div>

              <div className="rounded-lg bg-muted/30 p-4 space-y-1.5 text-sm">
                <SummaryRow label="תבנית:" value={`${preset.labelHe} (משלים שלי)`} />
                <SummaryRow label="שעת העברה:" value={inheritedPattern.handoff_time.slice(0, 5)} />
                <SummaryRow
                  label="התחלה:"
                  value={format(fromIsoDate(inheritedPattern.dtstart), 'dd.MM.yyyy', {
                    locale: he,
                  })}
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">תצוגה מקדימה — השבועיים הקרובים:</p>
                <FourteenDayRibbon days={ribbonDays} startIso={todayIso} />
                <CustodyLegend showNeither className="justify-center" />
              </div>

              <p className="text-[11px] text-muted-foreground text-center">
                אפשר לשנות כל פרט גם אחר-כך בהגדרות.
              </p>

              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={() => setEditing(true)}
                  disabled={confirming}
                  className="flex-1"
                >
                  <Pencil className="ml-1 h-4 w-4" />
                  אני רוצה לשנות
                </Button>
                <Button onClick={handleConfirm} disabled={confirming} className="flex-1">
                  {confirming ? (
                    <Loader2 className="ml-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="ml-1 h-4 w-4" />
                  )}
                  {confirming ? 'מאשר...' : 'מאשרת'}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Editing the inherited pattern also counts as consent (saving clears acts_as). */}
      <CustodyEditSheet
        open={editing}
        onOpenChange={(o) => {
          setEditing(o);
          if (!o) {
            // When the sheet closes after a save, refetch the inherited pattern
            // query — if it's gone (acts_as cleared), the modal disappears.
            qc.invalidateQueries({ queryKey: ['inherited-custody-pattern'] });
            qc.invalidateQueries({ queryKey: ['custody-data'] });
          }
        }}
        initialPattern={inheritedPattern ?? null}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['inherited-custody-pattern'] });
        }}
      />
    </>
  );
};

const SummaryRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-start gap-3">
    <span className="text-muted-foreground min-w-[7rem]">{label}</span>
    <span className="font-medium text-right flex-1">{value}</span>
  </div>
);

function evaluateDay(iso: string, pattern: CustodyPatternRow): DayOwner {
  const wd = weekdayIndex(iso);
  const hasBiWeekly = pattern.weekday_mask_week2 !== null;
  let activeMask: number;
  if (hasBiWeekly) {
    const phase = biWeeklyPhase(iso, pattern.dtstart);
    activeMask = phase === 0 ? pattern.weekday_mask_week1 : pattern.weekday_mask_week2 ?? 0;
  } else {
    activeMask = pattern.weekday_mask_week1;
  }
  // In the virtual-partner flow, the inherited pattern's owner is the virtual
  // partner (this user). So the mask indicates "my" days.
  return maskHasDay(activeMask, wd) ? 'A' : 'B';
}

void addIsoDays;
