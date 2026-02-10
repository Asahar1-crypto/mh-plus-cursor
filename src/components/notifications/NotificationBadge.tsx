/**
 * Notification Badge Component
 * Shows unread notification count and a dropdown panel with notification history
 */
import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Clock, AlertTriangle, X, RefreshCw } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

interface NotificationBadgeProps {
  className?: string;
  iconSize?: number;
}

interface NotificationLogEntry {
  id: string;
  notification_type: string;
  channel: string;
  platform: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
  data: Record<string, unknown>;
}

interface ExpenseNotificationEntry {
  id: string;
  expense_id: string;
  notification_type: string;
  status: string;
  created_at: string;
  error_message: string | null;
}

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  channel: string;
  status: string;
  created_at: string;
};

export function NotificationBadge({
  className,
  iconSize = 20,
}: NotificationBadgeProps) {
  const { unreadCount, clearUnread } = useNotifications();
  const { user, account } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const loadNotifications = async () => {
    if (!user?.id || !account?.id) return;
    setLoading(true);

    try {
      // Load from notification_logs (push notifications)
      const { data: pushLogs } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('account_id', account.id)
        .order('created_at', { ascending: false })
        .limit(20);

      // Load from expense_notifications (SMS notifications sent to this user)
      const { data: expenseNotifs } = await supabase
        .from('expense_notifications')
        .select('*')
        .eq('recipient_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      const items: NotificationItem[] = [];

      // Add push notification logs
      if (pushLogs) {
        for (const log of pushLogs as NotificationLogEntry[]) {
          items.push({
            id: log.id,
            title: log.title || 'התראה',
            body: log.body || '',
            channel: log.channel || 'push',
            status: log.status,
            created_at: log.created_at,
          });
        }
      }

      // Add expense SMS notifications
      if (expenseNotifs) {
        for (const notif of expenseNotifs as ExpenseNotificationEntry[]) {
          items.push({
            id: notif.id,
            title: 'הוצאה לאישור',
            body: notif.notification_type === 'sms' ? 'נשלח SMS' : 'התראה',
            channel: notif.notification_type || 'sms',
            status: notif.status,
            created_at: notif.created_at,
          });
        }
      }

      // Sort by date, newest first
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setNotifications(items.slice(0, 20));
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    const newOpen = !isOpen;
    setIsOpen(newOpen);
    if (newOpen) {
      clearUnread();
      loadNotifications();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Check className="h-3.5 w-3.5 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getChannelLabel = (channel: string) => {
    switch (channel) {
      case 'push': return 'Push';
      case 'sms': return 'SMS';
      case 'email': return 'Email';
      default: return channel;
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: he });
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleClick}
        className={cn(
          'relative inline-flex items-center justify-center p-2 rounded-full',
          'text-muted-foreground hover:text-foreground hover:bg-muted/80',
          'transition-colors duration-200',
          isOpen && 'bg-muted text-foreground',
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

      {/* Notification Panel */}
      {isOpen && (
        <div
          className={cn(
            'absolute top-full mt-2 left-0 sm:left-auto sm:right-0',
            'w-[320px] sm:w-[360px] max-h-[400px]',
            'bg-popover border border-border rounded-xl shadow-xl',
            'animate-in fade-in slide-in-from-top-2 duration-200',
            'z-50 overflow-hidden'
          )}
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">התראות</h3>
            <div className="flex items-center gap-1">
              <button
                onClick={loadNotifications}
                className="p-1 rounded hover:bg-muted transition-colors"
                title="רענן"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto max-h-[340px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">אין התראות עדיין</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  התראות יופיעו כאן כשיהיו הוצאות חדשות לאישור
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="px-4 py-3 border-b border-border/50 last:border-b-0 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      {getStatusIcon(notif.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium truncate">{notif.title}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground flex-shrink-0">
                          {getChannelLabel(notif.channel)}
                        </span>
                      </div>
                      {notif.body && (
                        <p className="text-xs text-muted-foreground truncate">{notif.body}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatTime(notif.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
