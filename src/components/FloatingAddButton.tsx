import React from 'react';
import { useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticImpact } from '@/lib/haptics';
import { useAddExpenseModal } from '@/hooks/useAddExpenseModal';

const FAB_PAGES = ['/dashboard', '/expenses'];

const FloatingAddButton: React.FC = () => {
  const location = useLocation();
  const { openModal } = useAddExpenseModal();

  if (!FAB_PAGES.includes(location.pathname)) return null;

  return (
    <button
      onClick={() => { hapticImpact('Light'); openModal(); }}
      className={cn(
        // Elevated 14px above the bottom nav per the handoff spec.
        // Cyan-only gradient (was cyan->amber) to match the new primary brand.
        // Big rounded-square (radius 18px) instead of full circle.
        'fixed z-40 flex items-center justify-center',
        'h-[52px] w-[52px] rounded-[18px]',
        'text-white',
        'transition-transform duration-150 active:scale-95',
        'bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px)-14px)] left-4',
      )}
      style={{
        background: 'var(--gradient-primary)',
        // Stronger cyan glow shadow per the spec
        boxShadow:
          '0 10px 20px -4px rgba(0, 183, 232, 0.6), 0 4px 8px -2px rgba(13, 40, 69, 0.15)',
      }}
      aria-label="הוסף הוצאה חדשה"
    >
      <Plus className="h-6 w-6 stroke-[2.5]" />
    </button>
  );
};

export default FloatingAddButton;
