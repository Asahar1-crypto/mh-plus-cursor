import React from 'react';
import { cn } from '@/lib/utils';

interface AuditBadgeProps {
  onClick?: () => void;
  className?: string;
}

/** G2 — Small "שונה" pill shown on edited day cells. */
export const AuditBadge: React.FC<AuditBadgeProps> = ({ onClick, className }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick?.();
    }}
    aria-label="ראה היסטוריה"
    title="שונה — לחץ לראות היסטוריה"
    className={cn(
      'inline-flex items-center text-[9px] font-semibold px-1 py-0.5 rounded',
      'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
      'hover:ring-1 hover:ring-amber-500 transition',
      className,
    )}
  >
    שונה
  </button>
);
