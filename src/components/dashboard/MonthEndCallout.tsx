/**
 * MonthEndCallout — green callout banner shown in the last 3 days of the
 * user's billing cycle, prompting them to settle the month.
 *
 * "Last 3 days" is calculated against each account's `billing_cycle_start_day`
 * — *not* the calendar month — so accounts whose cycles start on the 15th
 * see the callout from the 12th-14th, not from the 28th-30th. The math goes
 * through getCycleRange/getCurrentCycle so we share one source of truth with
 * the rest of the dashboard's cycle filters.
 *
 * Renders nothing when:
 *   - billingDay is invalid
 *   - the selected month isn't the user's *current* cycle (callout would be
 *     stale on past/future months)
 *   - more than `daysThreshold` days remain in the cycle
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MascotImage } from '@/components/mascot/MascotImage';
import { getCurrentCycle, getCycleRange } from '@/utils/billingCycleUtils';

interface MonthEndCalloutProps {
  /** Billing-cycle start day (1-31) from the account */
  billingDay: number;
  /** Currently selected month string `"YYYY-MM"` from the Dashboard filter */
  selectedMonth: string;
  /** How many days from cycle end should trigger the callout. Default 3. */
  daysThreshold?: number;
}

export function MonthEndCallout({
  billingDay,
  selectedMonth,
  daysThreshold = 3,
}: MonthEndCalloutProps) {
  const navigate = useNavigate();

  const visibility = useMemo(() => {
    if (!billingDay || billingDay < 1 || billingDay > 31) return null;
    if (!selectedMonth) return null;

    // Only show on the user's current cycle — past/future months would
    // surface a stale "settle now" prompt.
    const current = getCurrentCycle(billingDay);
    const currentKey = `${current.year}-${String(current.month).padStart(2, '0')}`;
    if (selectedMonth !== currentKey) return null;

    const { end } = getCycleRange(billingDay, current.month, current.year);
    const now = new Date();
    const msPerDay = 86_400_000;
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysRemaining = Math.round(
      (endDay.getTime() - todayDay.getTime()) / msPerDay,
    );

    if (daysRemaining < 0 || daysRemaining > daysThreshold) return null;

    return { daysRemaining, end };
  }, [billingDay, selectedMonth, daysThreshold]);

  if (!visibility) return null;

  const { daysRemaining } = visibility;
  const daysCopy =
    daysRemaining === 0
      ? 'היום'
      : daysRemaining === 1
        ? 'מחר'
        : `בעוד ${daysRemaining} ימים`;

  return (
    <Card
      className="overflow-hidden border-0 shadow-mascot"
      style={{ background: 'var(--gradient-success-brand)' }}
    >
      <CardContent className="p-5 sm:p-6 flex items-center gap-4 sm:gap-5 text-white">
        <MascotImage
          kind="blue"
          pose="success"
          size="sm"
          animate="success-glow"
          priority
          className="shrink-0 drop-shadow-2xl"
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-white/80">
            סגירת חודש
          </p>
          <h3 className="mt-0.5 text-lg sm:text-xl font-extrabold leading-tight">
            הגיע הזמן לסגור את החודש
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-white/90">
            המחזור הנוכחי נגמר {daysCopy}. בואו נסדר את ההוצאות
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/monthly-settlement')}
          className="shrink-0 font-bold bg-white text-emerald-700 hover:bg-white/90"
        >
          סגירה
        </Button>
      </CardContent>
    </Card>
  );
}
