/**
 * HeroBalanceCard — primary hero on the dashboard.
 *
 * Implements the deep-gradient hero from the 2026-05-15 mascot handoff:
 *   - Dark navy/cyan gradient background with two radial decorative blobs
 *   - Large tabular amount with cents shown smaller
 *   - Optional month-over-month delta (auto-colored green/amber)
 *   - Optional budget progress bar
 *   - Budget illustration tilted -4° in the corner
 *
 * Self-contained (no data fetching); callers pass everything as props so
 * this card can render in dashboard, settlement, or onboarding previews.
 */
import { useMemo } from 'react';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const HERO_ILLUSTRATION = '/illustrations/budget.webp';

/**
 * One member's outstanding balance in the current period.
 * balance > 0 → they owe (חייב)
 * balance < 0 → they are owed (זכאי)
 * balance ≈ 0 → settled (מאוזן)
 */
export interface PaymentSplitMember {
  userId: string;
  userName: string;
  balance: number;
}

export interface PaymentSplit {
  members: PaymentSplitMember[];
  /** Render a "two members required" note when length < 2 */
  insufficientMembers?: boolean;
}

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
   * gradient to flag overspending.
   */
  baselineAverage?: number;
  /**
   * Optional outstanding-payment breakdown per member. When present, the
   * card renders a divider + per-member chips + a net settlement banner
   * below the hero amount. Use this to fold the old MonthlyFoodPaymentCard
   * into the hero — the card stays single, the data stays denormalized.
   */
  paymentSplit?: PaymentSplit;
  /** ISO currency suffix, defaults to "₪" */
  currencySymbol?: string;
  className?: string;
}

/**
 * Per-status visual config for the payment-split chips. Tuned for both
 * the deep navy background AND the warm amber overspending state — light
 * 200-series fills/borders read on both because the chip itself has its
 * own translucent backdrop.
 */
const SPLIT_STATUS = {
  owes: {
    label: 'חייב',
    text: 'text-amber-200',
    border: 'border-amber-300/40',
    dot: 'bg-amber-300',
    bg: 'rgba(245, 168, 35, 0.12)',
  },
  owed: {
    label: 'זכאי',
    text: 'text-emerald-200',
    border: 'border-emerald-300/40',
    dot: 'bg-emerald-300',
    bg: 'rgba(34, 197, 94, 0.14)',
  },
  balanced: {
    label: 'מאוזן',
    text: 'text-cyan-200',
    border: 'border-cyan-300/40',
    dot: 'bg-cyan-300',
    bg: 'rgba(0, 209, 255, 0.12)',
  },
} as const;

function getSplitStatus(balance: number) {
  if (Math.abs(balance) < 1) return SPLIT_STATUS.balanced;
  return balance > 0 ? SPLIT_STATUS.owes : SPLIT_STATUS.owed;
}

const formatThousands = (n: number): string =>
  Math.round(Math.abs(n)).toLocaleString('he-IL');

export function HeroBalanceCard({
  currentAmount,
  label,
  budget,
  previousAmount,
  baselineAverage,
  paymentSplit,
  currencySymbol = '₪',
  className,
}: HeroBalanceCardProps) {
  // "Warning" state — overspending vs the user's historical baseline.
  // Threshold matches the handoff spec (1.2x average). When triggered we
  // switch the card from deep navy to a warm amber gradient.
  const overspending =
    baselineAverage !== undefined &&
    baselineAverage > 0 &&
    currentAmount > baselineAverage * 1.2;

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
      <div className="relative z-10 flex items-end justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0 pe-1 sm:pe-2">
          {/* Kicker label */}
          <p className="type-label uppercase tracking-[0.1em] text-white/70 mb-2">
            {label}
          </p>

          {/* Whole-shekel amount only — cents are noise at this size and
              the rest of the dashboard rounds to whole shekels too. */}
          <div className="tabular-nums">
            <span className="text-4xl sm:text-5xl font-black leading-none">
              {currencySymbol}{formatThousands(currentAmount)}
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

        <div
          className="relative shrink-0 w-32 sm:w-40 h-24 sm:h-28 -mb-5 sm:-mb-6 -me-1 sm:-me-2 pointer-events-none"
          aria-hidden="true"
        >
          <img
            src={HERO_ILLUSTRATION}
            alt=""
            width={160}
            height={160}
            className="absolute bottom-0 inset-inline-end-0 h-32 w-32 sm:h-40 sm:w-40 object-contain object-bottom scale-x-[-1] rotate-[-4deg] drop-shadow-2xl animate-float"
          />
        </div>
      </div>

      {/* Optional payment-split section — folded in from the old
          MonthlyFoodPaymentCard so the dashboard has a single hero. */}
      {paymentSplit && paymentSplit.members.length > 0 && (
        <div className="relative z-10 mt-6">
          {/* Subtle divider */}
          <div aria-hidden="true" className="h-px w-full bg-white/15 mb-4" />

          <p className="type-label uppercase tracking-[0.1em] text-white/70 mb-3">
            חלוקת תשלומים פתוחה
          </p>

          {/* Per-member chips */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {paymentSplit.members.map((member) => {
              const status = getSplitStatus(member.balance);
              const amount = Math.round(Math.abs(member.balance));
              return (
                <div
                  key={member.userId}
                  className={cn(
                    'rounded-xl p-3 sm:p-3.5 border backdrop-blur-sm',
                    status.border,
                  )}
                  style={{ background: status.bg }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={cn('w-2 h-2 rounded-full', status.dot)} aria-hidden="true" />
                    <span className="text-[11px] font-semibold text-white/85 truncate">
                      {member.userName}
                    </span>
                  </div>
                  <div className={cn('text-lg sm:text-xl font-extrabold tabular-nums leading-tight', status.text)}>
                    {currencySymbol}{amount.toLocaleString('he-IL')}
                  </div>
                  <div className={cn('text-[10px] font-medium opacity-90 mt-0.5', status.text)}>
                    {status.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Net settlement banner — who owes whom */}
          {paymentSplit.members.length >= 2 && (() => {
            const userA = paymentSplit.members[0];
            const userB = paymentSplit.members[1];
            const net = userA.balance - userB.balance;
            const settled = Math.abs(net) < 1;
            const debtor = net > 0 ? userA.userName : userB.userName;
            const creditor = net > 0 ? userB.userName : userA.userName;
            return (
              <div
                className={cn(
                  'mt-3 rounded-xl border px-3 py-2.5 backdrop-blur-sm',
                  settled
                    ? 'border-emerald-300/40'
                    : 'border-white/20',
                )}
                style={{
                  background: settled
                    ? 'rgba(34, 197, 94, 0.14)'
                    : 'rgba(255, 255, 255, 0.06)',
                }}
              >
                {settled ? (
                  <div className="flex items-center justify-center gap-2 text-emerald-200">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-bold">החשבון מאוזן</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 flex-wrap text-white">
                    <span className="text-sm font-bold">{debtor}</span>
                    <ArrowLeft className="h-3.5 w-3.5 text-white/70 shrink-0" aria-hidden="true" />
                    <span className="text-sm font-extrabold tabular-nums text-cyan-200">
                      {currencySymbol}{Math.round(Math.abs(net)).toLocaleString('he-IL')}
                    </span>
                    <ArrowLeft className="h-3.5 w-3.5 text-white/70 shrink-0" aria-hidden="true" />
                    <span className="text-sm font-bold">{creditor}</span>
                  </div>
                )}
              </div>
            );
          })()}

          {paymentSplit.insufficientMembers && paymentSplit.members.length < 2 && (
            <p className="mt-2 text-center text-[11px] text-white/55">
              נדרשים שני חברי חשבון לחישוב נטו
            </p>
          )}
        </div>
      )}

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
