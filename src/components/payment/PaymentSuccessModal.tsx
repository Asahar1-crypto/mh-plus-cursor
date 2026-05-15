/**
 * PaymentSuccessModal — the "תשלום בוצע" payoff moment.
 *
 * Fires when a single expense flips to `paid`. Renders the spec's hero
 * celebration: confetti burst, mascot in 'success' pose with green glow,
 * gradient amount text, and a meta grid (description + payee + date).
 *
 * Confetti uses canvas-confetti (already in package.json — same library
 * the Dashboard already imports for mark-as-paid). Honors prefers-reduced-
 * motion: confetti skipped, mascot freezes, modal still appears.
 *
 * Auto-dismiss is intentional (3s) for momentum — user can also press the
 * CTA to close earlier. Bulk settlement flows should NOT use this modal
 * (too noisy across many expenses); they keep their own toast pattern.
 */
import { useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MascotImage } from '@/components/mascot/MascotImage';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const CONFETTI_COLORS = ['#22C55E', '#16A34A', '#F5A823', '#00B7E8', '#FBBF24'];

interface PaymentSuccessModalProps {
  open: boolean;
  onClose: () => void;
  /** Amount paid (positive number, no sign) */
  amount: number;
  /** Free-text expense description, e.g. "חוגים יואב" */
  description?: string;
  /** Optional payee name, e.g. "מיכל" */
  payeeName?: string;
  currencySymbol?: string;
}

function formatAmount(n: number, currency: string): string {
  const whole = Math.floor(Math.abs(n)).toLocaleString('he-IL');
  const cents = Math.round((Math.abs(n) - Math.floor(Math.abs(n))) * 100)
    .toString()
    .padStart(2, '0');
  return `${currency}${whole}.${cents}`;
}

export function PaymentSuccessModal({
  open,
  onClose,
  amount,
  description,
  payeeName,
  currencySymbol = '₪',
}: PaymentSuccessModalProps) {
  const reduceMotion = useReducedMotion();

  // Confetti burst on mount. Two cannons — one from each side — for a
  // symmetric feel even in RTL where "left/right" lose their meaning.
  useEffect(() => {
    if (!open || reduceMotion) return;

    let cancelled = false;
    (async () => {
      const confetti = (await import('canvas-confetti')).default;
      if (cancelled) return;

      // Two staggered bursts from screen edges
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { x: 0, y: 0.4 },
        angle: 60,
        colors: CONFETTI_COLORS,
        ticks: 200,
        scalar: 0.9,
      });
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { x: 1, y: 0.4 },
        angle: 120,
        colors: CONFETTI_COLORS,
        ticks: 200,
        scalar: 0.9,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [open, reduceMotion]);

  // Auto-dismiss after 3.5s so the moment stays light
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(onClose, 3500);
    return () => window.clearTimeout(timer);
  }, [open, onClose]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-sm rounded-3xl p-0 overflow-hidden border-0 shadow-mascot"
        aria-describedby={undefined}
      >
        {/* Hero zone — green glow halo behind the mascot */}
        <div className="relative pt-8 pb-2 flex items-center justify-center">
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 60%, rgba(34,197,94,0.32) 0%, transparent 60%)',
            }}
          />
          <MascotImage
            kind="blue"
            pose="success"
            size="lg"
            animate="success-glow"
            priority
            className="relative drop-shadow-2xl"
          />
        </div>

        {/* Success pill */}
        <div className="px-6 pt-3 flex justify-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-[0.08em]">
            <span aria-hidden="true">✓</span> שולם בהצלחה
          </span>
        </div>

        {/* Gradient amount */}
        <div className="px-6 pt-3 text-center">
          <p
            className="text-4xl sm:text-5xl font-black leading-tight tabular-nums"
            style={{
              background: 'var(--gradient-success-brand)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {formatAmount(amount, currencySymbol)}
          </p>
          {(description || payeeName) && (
            <p className="mt-1 text-sm text-muted-foreground">
              {description}
              {description && payeeName && <span className="mx-1">·</span>}
              {payeeName && <span>ל{payeeName}</span>}
            </p>
          )}
        </div>

        {/* CTA */}
        <div className="px-6 pb-7 pt-5">
          <Button onClick={onClose} className="w-full h-11 rounded-2xl font-bold">
            המשך
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
