import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticImpact } from '@/lib/haptics';

const FAB_PAGES = ['/dashboard', '/expenses'];

const FloatingAddButton: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  if (!FAB_PAGES.includes(location.pathname)) return null;

  return (
    <button
      onClick={() => { hapticImpact('Light'); navigate('/add-expense'); }}
      className={cn(
        'fixed z-30 flex items-center justify-center',
        'h-14 w-14 rounded-full',
        'bg-gradient-to-br from-primary to-secondary text-white',
        'shadow-lg shadow-primary/30',
        'active:scale-95 transition-transform duration-150',
        'bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-4'
      )}
      aria-label="הוסף הוצאה חדשה"
    >
      <Plus className="h-6 w-6" />
    </button>
  );
};

export default FloatingAddButton;
