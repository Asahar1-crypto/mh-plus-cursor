/**
 * BottomNavBar — sticky bottom navigation with the elevated FAB in the
 * center per the handoff spec.
 *
 * Structure (5 visual slots):
 *   [Dashboard] [Expenses] [ + FAB ] [Settlement] [Reports]
 *
 * The FAB lives in the middle slot, elevated -14px above the bar, with
 * the cyan gradient + glow shadow that the spec specifies. The "More"
 * button that used to live here is dropped — the mobile hamburger in
 * AppHeader already opens the sidebar, so the bottom slot was redundant.
 *
 * onMoreClick is still accepted for backwards compatibility with callers
 * (AppLayout) but is no longer rendered.
 */
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, CreditCard, Calculator, BarChart3, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExpense } from '@/contexts/ExpenseContext';
import { hapticSelection, hapticImpact } from '@/lib/haptics';
import { useAddExpenseModal } from '@/hooks/useAddExpenseModal';

interface BottomNavBarProps {
  /** @deprecated mobile hamburger lives in AppHeader now; kept for callers */
  onMoreClick?: () => void;
}

type NavSlot = {
  icon: typeof Home;
  label: string;
  path: string;
  showBadge?: boolean;
};

// Split into left + right so the FAB can sit between them in the layout
const LEFT_SLOTS: NavSlot[] = [
  { icon: Home, label: 'דשבורד', path: '/dashboard' },
  { icon: CreditCard, label: 'הוצאות', path: '/expenses', showBadge: true },
];
const RIGHT_SLOTS: NavSlot[] = [
  { icon: Calculator, label: 'סגירה', path: '/monthly-settlement' },
  { icon: BarChart3, label: 'דוחות', path: '/reports' },
];

function NavLink({
  slot,
  pendingCount,
}: {
  slot: NavSlot;
  pendingCount: number;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = location.pathname === slot.path;
  const Icon = slot.icon;

  return (
    <Link
      to={slot.path}
      onClick={() => {
        if (!isActive) hapticSelection();
      }}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative transition-colors duration-200',
        isActive
          ? 'text-primary'
          : 'text-muted-foreground active:text-primary/70',
      )}
    >
      <div className="relative">
        <Icon
          className={cn(
            'h-5 w-5 transition-transform duration-200',
            isActive && 'scale-110',
          )}
        />
        {slot.showBadge && pendingCount > 0 && (
          <span
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              hapticSelection();
              navigate('/expenses?status=pending&month=all');
            }}
            className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1 leading-none cursor-pointer"
          >
            {pendingCount > 99 ? '99+' : pendingCount}
          </span>
        )}
      </div>
      <span
        className={cn(
          'text-[10px] font-medium leading-tight',
          isActive && 'font-semibold',
        )}
      >
        {slot.label}
      </span>
      {isActive && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-b-full" />
      )}
    </Link>
  );
}

const BottomNavBar: React.FC<BottomNavBarProps> = () => {
  const { getPendingExpenses } = useExpense();
  const { openModal } = useAddExpenseModal();
  const pendingCount = getPendingExpenses().length;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 liquid-glass-strong border-t border-border/50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="relative flex items-center justify-around h-16 px-1">
        {/* Left half */}
        {LEFT_SLOTS.map((slot) => (
          <NavLink key={slot.path} slot={slot} pendingCount={pendingCount} />
        ))}

        {/* Center FAB slot — keeps the layout's flex spacing right without
            painting anything; the actual button is absolutely positioned. */}
        <div className="flex-1" aria-hidden="true" />

        {/* Right half */}
        {RIGHT_SLOTS.map((slot) => (
          <NavLink key={slot.path} slot={slot} pendingCount={pendingCount} />
        ))}

        {/* The elevated FAB itself */}
        <button
          onClick={() => {
            hapticImpact('Light');
            openModal();
          }}
          className={cn(
            'absolute left-1/2 -translate-x-1/2 z-10',
            'flex items-center justify-center',
            'h-[52px] w-[52px] rounded-[18px]',
            'text-white transition-transform duration-150 active:scale-95',
          )}
          style={{
            top: '-14px',
            background: 'var(--gradient-primary)',
            boxShadow:
              '0 10px 20px -4px rgba(0, 183, 232, 0.6), 0 4px 8px -2px rgba(13, 40, 69, 0.15)',
          }}
          aria-label="הוסף הוצאה חדשה"
        >
          <Plus className="h-6 w-6 stroke-[2.5]" />
        </button>
      </div>
    </nav>
  );
};

export default BottomNavBar;
