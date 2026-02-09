/**
 * Notification Handler
 * Processes incoming push notifications and triggers appropriate UI updates
 */
import { toast } from 'sonner';
import { NotificationType } from './types';

interface NotificationData {
  type: string;
  title?: string;
  body?: string;
  accountId?: string;
  actionUrl?: string;
  [key: string]: string | undefined;
}

/**
 * Handle a foreground push notification
 * Shows a toast and dispatches appropriate events
 */
export function handleForegroundNotification(payload: {
  notification?: { title?: string; body?: string };
  data?: NotificationData;
}): void {
  const title = payload.notification?.title || 'התראה חדשה';
  const body = payload.notification?.body || '';
  const type = payload.data?.type;
  const actionUrl = payload.data?.actionUrl;

  // Show toast notification
  toast.info(title, {
    description: body,
    duration: 6000,
    action: actionUrl
      ? {
          label: 'פתח',
          onClick: () => {
            window.location.href = actionUrl;
          },
        }
      : undefined,
  });

  // Dispatch type-specific events for UI updates
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
 * Handle notification click from service worker
 * Called when user taps a background notification
 */
export function handleNotificationClick(data: NotificationData): void {
  if (data.actionUrl) {
    window.location.href = data.actionUrl;
  }

  // Trigger a refresh of the relevant data
  if (data.type) {
    dispatchNotificationEvent(data.type);
  }
}
