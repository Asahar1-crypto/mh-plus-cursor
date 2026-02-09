/**
 * Notification Badge Component
 * Shows unread notification count as a badge on the bell icon
 */
import React from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils';

interface NotificationBadgeProps {
  className?: string;
  onClick?: () => void;
  iconSize?: number;
}

export function NotificationBadge({
  className,
  onClick,
  iconSize = 20,
}: NotificationBadgeProps) {
  const { unreadCount, clearUnread } = useNotifications();

  const handleClick = () => {
    clearUnread();
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'relative inline-flex items-center justify-center p-2 rounded-full',
        'text-muted-foreground hover:text-foreground hover:bg-muted/80',
        'transition-colors duration-200',
        className
      )}
      aria-label={`התראות${unreadCount > 0 ? ` (${unreadCount} חדשות)` : ''}`}
    >
      <Bell style={{ width: iconSize, height: iconSize }} />

      {unreadCount > 0 && (
        <span
          className={cn(
            'absolute -top-0.5 -right-0.5 flex items-center justify-center',
            'min-w-[18px] h-[18px] rounded-full',
            'bg-red-500 text-white text-[10px] font-bold',
            'animate-in fade-in zoom-in-50 duration-200',
            'px-1'
          )}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
