/**
 * QuickActionsRow — the 4-card primary-action row below the HeroBalanceCard.
 *
 * Mirrors the handoff Mobile App Mockup ("Dashboard hero → 4 quick actions →
 * stats → activity"). The order is RTL-friendly: + appears on the right
 * (first reading position), reports on the left.
 *
 * QuickActionCard is co-located here — it's only used by this row and
 * keeping it private avoids a tiny one-off shared file.
 */
import type { LucideIcon } from 'lucide-react';
import { Plus, ScanLine, Calculator, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAddExpenseModal } from '@/hooks/useAddExpenseModal';

/**
 * Tint → class map. Tailwind's JIT can't expand a dynamic `bg-${tint}-100`
 * at build time, so we freeze the full class strings here. Same pattern
 * used by SPLIT_STATUS in HeroBalanceCard.
 */
const TINT_CLASSES: Record<TintKey, { iconWrap: string; icon: string }> = {
  cyan: {
    iconWrap: 'bg-primary/10 dark:bg-primary/15',
    icon: 'text-primary',
  },
  emerald: {
    iconWrap: 'bg-emerald-100 dark:bg-emerald-900/30',
    icon: 'text-emerald-600 dark:text-emerald-300',
  },
  amber: {
    iconWrap: 'bg-amber-100 dark:bg-amber-900/30',
    icon: 'text-amber-600 dark:text-amber-300',
  },
  violet: {
    iconWrap: 'bg-violet-100 dark:bg-violet-900/30',
    icon: 'text-violet-600 dark:text-violet-300',
  },
};

type TintKey = 'cyan' | 'emerald' | 'amber' | 'violet';

interface QuickActionCardProps {
  icon: LucideIcon;
  label: string;
  tint: TintKey;
  onClick: () => void;
  ariaLabel?: string;
}

function QuickActionCard({
  icon: Icon,
  label,
  tint,
  onClick,
  ariaLabel,
}: QuickActionCardProps) {
  const tintClasses = TINT_CLASSES[tint];
  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={ariaLabel ?? label}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        // liquid-glass-subtle gives the soft frosted feel that pairs with the
        // hero gradient above. min-h-[88px] keeps the touch target generous
        // even when labels wrap on narrow phones.
        'liquid-glass-subtle cursor-pointer transition-all duration-200',
        'flex flex-col items-center justify-center gap-2 p-3 sm:p-4 min-h-[88px]',
        'hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl',
          tintClasses.iconWrap,
        )}
      >
        <Icon className={cn('h-5 w-5 sm:h-6 sm:w-6', tintClasses.icon)} />
      </span>
      <span className="text-[11px] sm:text-xs font-semibold text-foreground leading-tight text-center">
        {label}
      </span>
    </Card>
  );
}

export function QuickActionsRow() {
  const navigate = useNavigate();
  const { openModal } = useAddExpenseModal();

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
      <QuickActionCard
        icon={Plus}
        label="הוצאה חדשה"
        tint="cyan"
        onClick={() => openModal()}
        ariaLabel="הוסף הוצאה חדשה"
      />
      <QuickActionCard
        icon={ScanLine}
        label="סריקת קבלה"
        tint="emerald"
        onClick={() => openModal('scan')}
        ariaLabel="סרוק קבלה לזיהוי אוטומטי"
      />
      <QuickActionCard
        icon={Calculator}
        label="סגירת חודש"
        tint="amber"
        onClick={() => navigate('/monthly-settlement')}
      />
      <QuickActionCard
        icon={BarChart3}
        label="דוחות"
        tint="violet"
        onClick={() => navigate('/reports')}
      />
    </div>
  );
}
