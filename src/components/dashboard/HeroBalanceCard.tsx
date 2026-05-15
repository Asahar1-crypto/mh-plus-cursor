/**
 * HeroBalanceCard — primary hero on the dashboard.
 *
 * Implements the deep-gradient hero from the 2026-05-15 mascot handoff:
 *   - Dark navy/cyan gradient background with two radial decorative blobs
 *   - Large tabular amount with cents shown smaller
 *   - Optional month-over-month delta (auto-colored green/amber)
 *   - Optional budget progress bar
 *   - A small blue mascot mini tilted -4° in the bottom corner
 *
 * Self-contained (no data fetching); callers pass everything as props so
 * this card can render in dashboard, settlement, or onboarding previews.
 */
import { useMemo } from 'react';
import { MascotImage, type MascotPose } from '@/components/mascot/MascotImage';
import { cn } from '@/lib/utils';

interface HeroBalanceCardProps {
  /** Big number — currently approved + paid for the period */
  currentAmount: number;
  /** Label above amount, e.g. "היתרה · מאי 2026" */
  label: string;
  /** Optional total budget; when present, renders a progress bar */
  budget?: number;
  /** Optional previous-period amount for the delta indicator */
  previousAmount?: number;
  /**
   * Optional rolling baseline (e.g. avg of last 3 cycles). When the current
   * amount exceeds 1.2× this baseline the card switches to a warm/amber
   * gradient and the mascot pose to 'checking' to flag overspending.
   */
  baselineAverage?: number;
  /**
   * Override the mascot pose. Defaults to 'happy' for healthy budgets,
   * 'checking' when over budget. Callers can force 'success' for
   * month-end celebrations.
   */
  mascotPose?: MascotPose;
  /** ISO currency suffix, defaults to "₪" */
  currencySymbol?: string;
  className?: string;
}

const formatThousands = (n: number): string =>
  Math.floor(Math.abs(n)).toLocaleString('he-IL');

const formatCents = (n: number): string => {
  const cents = Math.round((Math.abs(n) - Math.floor(Math.abs(n))) * 100);
  return cents.toString().padStart(2, '0');
};

export function HeroBalanceCard({
  currentAmount,
  label,
  budget,
  previousAmount,
  baselineAverage,
  mascotPose,
  currencySymbol = '₪',
  className,
}: HeroBalanceCardProps) {
  const overBudget = budget !== undefined && currentAmount > budget;
  // "Warning" state — overspending vs the user's historical baseline.
  // Threshold matches the handoff spec (1.2x average). When triggered we
  // switch the card from deep navy to a warm amber gradient and flag the
  // mascot as 'checking'.
  const overspending =
    baselineAverage !== undefined &&
    baselineAverage > 0 &&
    currentAmount > baselineAverage * 1.2;

  // Auto-pick mascot pose if caller didn't override
  const pose: MascotPose =
    mascotPose ?? (overBudget || overspending ? 'checking' : 'happy');

  // Delta vs previous period — colour green for "less spent", amber for "more"
  const delta = useMemo(() => {
    if (previousAmount === undefined || previousAmount === 0) return null;
    const pct = ((currentAmount - previousAmount) / previousAmount) * 100;
    const isUp = pct > 0;
    return {
      pct: Math.abs(pct).toFixed(0),
      isUp,
      // For spending, going UP is a warning. Going DOWN is good.
      colour: isUp ? 'text-amber-400' : 'text-emerald-400',
      arrow: isUp ? '▲' : '▼',
    };
  }, [currentAmount, previousAmount]);

  const progressPct = useMemo(() => {
    if (!budget) return null;
    return Math.min(100, Math.max(0, (currentAmount / budget) * 100));
  }, [currentAmount, budget]);

  return (
    <div
      className={cn(
        // Deep navy by default; warm amber when overspending vs baseline.
        'relative overflow-hidden rounded-[22px] p-6 sm:p-8 mb-4 sm:mb-6',
        'text-white shadow-mascot',
        className,
      )}
      style={{
        background: overspending ? 'var(--gradient-warm-brand)' : 'var(--gradient-deep)',
      }}
    >
      {/* Decorative radial blobs — top-start + bottom-end, cyan glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background: `
            radial-gradient(circle at 0% 0%, rgba(0,209,255,0.28) 0%, transparent 45%),
            radial-gradient(circle at 100% 100%, rgba(0,183,232,0.22) 0%, transparent 50%)
          `,
        }}
      />

      {/* Card content (over the blobs) */}
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Kicker label */}
          <p className="type-label uppercase tracking-[0.1em] text-white/70 mb-2">
            {label}
          </p>

          {/* Amount with smaller cents */}
          <div className="flex items-baseline gap-1 tabular-nums">
            <span className="text-4xl sm:text-5xl font-black leading-none">
              {currencySymbol}{formatThousands(currentAmount)}
            </span>
            <span className="text-xl sm:text-2xl font-bold leading-none text-white/70">
              .{formatCents(currentAmount)}
            </span>
          </div>

          {/* Delta — only when previous period given */}
          {delta && (
            <p className={cn('mt-2 text-xs font-extrabold tabular-nums', delta.colour)}>
              <span aria-hidden="true">{delta.arrow}</span> {delta.pct}%
              <span className="ms-2 font-medium text-white/60">לעומת חודש קודם</span>
            </p>
          )}
        </div>

        {/* Mascot mini — tilted -4° per the spec, bottom-aligned */}
        <MascotImage
          kind="blue"
          pose={pose}
          size="sm"
          animate="idle"
          priority
          className="-mt-2 -mb-4 -me-2 rotate-[-4deg] drop-shadow-2xl"
        />
      </div>

      {/* Optional budget progress */}
      {progressPct !== null && budget !== undefined && (
        <div className="relative z-10 mt-5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-gradient-primary-brand transition-[width] duration-700 ease-out"
              style={{
                width: `${progressPct}%`,
                background: 'var(--gradient-primary)',
              }}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={budget}
              aria-valuenow={currentAmount}
              aria-label={`${currentAmount} מתוך ${budget} ${currencySymbol}`}
            />
          </div>
          <p className="mt-1.5 text-[10px] font-semibold text-white/65 tabular-nums">
            {currencySymbol}{formatThousands(currentAmount)} / {currencySymbol}{formatThousands(budget)}
            {progressPct >= 100 && (
              <span className="ms-2 text-amber-300">חריגה</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
