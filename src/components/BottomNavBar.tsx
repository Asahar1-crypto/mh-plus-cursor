import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, CreditCard, Calculator, BarChart3, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExpense } from '@/contexts/ExpenseContext';
import { hapticSelection } from '@/lib/haptics';

interface BottomNavBarProps {
  onMoreClick: () => void;
}

const navItems = [
  { icon: Home, label: 'דשבורד', path: '/dashboard' },
  { icon: CreditCard, label: 'הוצאות', path: '/expenses', showBadge: true },
  { icon: Calculator, label: 'סגירה', path: '/monthly-settlement' },
  { icon: BarChart3, label: 'דוחות', path: '/reports' },
];

const BottomNavBar: React.FC<BottomNavBarProps> = ({ onMoreClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { getPendingExpenses } = useExpense();

  const pendingCount = getPendingExpenses().length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 liquid-glass-strong border-t border-border/50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map(({ icon: Icon, label, path, showBadge }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              onClick={() => { if (!isActive) hapticSelection(); }}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative transition-colors duration-200',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-primary/70'
              )}
            >
              <div className="relative">
                <Icon className={cn('h-5 w-5 transition-transform duration-200', isActive && 'scale-110')} />
                {showBadge && pendingCount > 0 && (
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
              <span className={cn('text-[10px] font-medium leading-tight', isActive && 'font-semibold')}>
                {label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-b-full" />
              )}
            </Link>
          );
        })}
        {/* More button */}
        <button
          onClick={() => { hapticSelection(); onMoreClick(); }}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-muted-foreground active:text-primary/70 transition-colors duration-200"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] font-medium leading-tight">עוד</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNavBar;
