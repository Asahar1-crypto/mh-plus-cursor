/**
 * Notification Handler
 * Processes incoming push notifications and triggers appropriate UI updates
 */
import { toast } from 'sonner';
import { NotificationType } from './types';
import { supabase } from '@/integrations/supabase/client';

interface NotificationData {
  type: string;
  title?: string;
  body?: string;
  accountId?: string;
  actionUrl?: string;
  notificationId?: string;
  [key: string]: string | undefined;
}

/**
 * Validates that a URL is a safe relative path (not an external redirect).
 * Blocks absolute URLs, protocol-relative URLs, and javascript: URIs.
 */
function isSafeRelativeUrl(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  // Must start with / and not // (protocol-relative)
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return false;
  // Block javascript: and data: URIs embedded after path
  if (/javascript:|data:/i.test(trimmed)) return false;
  return true;
}

/**
 * Handle a foreground push notification
 * Shows a toast when the tab is focused; falls back to a system notification
 * when the tab is hidden/blurred so the user actually sees the alert even
 * with another tab on top.
 */
export function handleForegroundNotification(payload: {
  notification?: { title?: string; body?: string };
  data?: NotificationData;
}): void {
  const title = payload.notification?.title || 'התראה חדשה';
  const body = payload.notification?.body || '';
  const type = payload.data?.type;
  const actionUrl = payload.data?.actionUrl;

  const isFocused =
    typeof document !== 'undefined' &&
    document.visibilityState === 'visible' &&
    document.hasFocus();

  if (isFocused) {
    // User is actively in the tab — toast is enough and avoids double-alert.
    toast.info(title, {
      description: body,
      duration: 6000,
      action: actionUrl && isSafeRelativeUrl(actionUrl)
        ? {
            label: 'פתח',
            onClick: () => {
              window.location.href = actionUrl;
            },
          }
        : undefined,
    });
  } else {
    // Tab is hidden/blurred — surface a system notification via the SW so the
    // user actually sees the alert. The SW's own onBackgroundMessage doesn't
    // fire for foreground messages, so we ask it explicitly.
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((registration) => {
          registration.showNotification(title, {
            body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            data: payload.data || {},
            dir: 'rtl',
            lang: 'he',
            tag: payload.data?.tag || (type ? `${type}_${payload.data?.expenseId || payload.data?.id || Date.now()}` : 'default'),
          });
        })
        .catch((err) => {
          console.error('[Notifications] Foreground showNotification failed:', err);
        });
    }
  }

  // Dispatch type-specific events for UI updates regardless of display path
  if (type) {
    dispatchNotificationEvent(type);
  }
}

/**
 * Dispatch custom events based on notification type
 * Other components can listen to these events and update accordingly
 */
function dispatchNotificationEvent(type: string): void {
  switch (type) {
    case NotificationType.EXPENSE_PENDING_APPROVAL:
    case NotificationType.EXPENSE_APPROVED:
    case NotificationType.EXPENSE_REJECTED:
    case NotificationType.EXPENSE_PAID:
      window.dispatchEvent(new CustomEvent('refresh-expenses'));
      break;

    case NotificationType.BUDGET_THRESHOLD_75:
    case NotificationType.BUDGET_THRESHOLD_90:
    case NotificationType.BUDGET_EXCEEDED:
      window.dispatchEvent(new CustomEvent('budget-alert'));
      window.dispatchEvent(new CustomEvent('refresh-dashboard'));
      break;

    case NotificationType.MONTHLY_SETTLEMENT_READY:
      window.dispatchEvent(new CustomEvent('refresh-settlement'));
      break;

    case NotificationType.INVITATION_RECEIVED:
    case NotificationType.NEW_FAMILY_MEMBER:
      window.dispatchEvent(new CustomEvent('refresh-invitations'));
      break;

    case NotificationType.RECURRING_EXPENSE_CREATED:
      window.dispatchEvent(new CustomEvent('refresh-expenses'));
      break;

    default:
      window.dispatchEvent(new CustomEvent('refresh-dashboard'));
      break;
  }
}

/**
 * Handle notification click from service worker.
 * Called when user taps a background notification. Marks the row in
 * notification_logs as `clicked` so engagement metrics are visible, then
 * navigates and refreshes data.
 */
export function handleNotificationClick(data: NotificationData): void {
  // Fire-and-forget click logging. RPC is scoped to auth.uid() so it cannot
  // be abused to poison another user's logs even if notificationId leaks.
  if (data.notificationId) {
    supabase
      .rpc('mark_notification_clicked', { p_notification_id: data.notificationId })
      .then(({ error }) => {
        if (error) {
          console.warn('[Notifications] mark_notification_clicked failed:', error.message);
        }
      });
  }

  if (data.actionUrl && isSafeRelativeUrl(data.actionUrl)) {
    window.location.href = data.actionUrl;
  }

  // Trigger a refresh of the relevant data
  if (data.type) {
    dispatchNotificationEvent(data.type);
  }
}
