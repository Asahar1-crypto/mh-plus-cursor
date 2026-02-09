/**
 * Firebase Cloud Messaging - Mobile Implementation (Capacitor)
 * Handles push notifications for Android and iOS
 */
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

// Dynamic import to avoid errors on web platform
let PushNotifications: typeof import('@capacitor/push-notifications').PushNotifications | null = null;

async function loadPushPlugin() {
  if (PushNotifications) return PushNotifications;
  
  if (!Capacitor.isNativePlatform()) {
    console.log('Not a native platform, push notifications plugin not loaded');
    return null;
  }

  try {
    const module = await import('@capacitor/push-notifications');
    PushNotifications = module.PushNotifications;
    return PushNotifications;
  } catch (error) {
    console.error('Error loading push notifications plugin:', error);
    return null;
  }
}

/**
 * Initialize push notifications for mobile platforms
 */
export async function initializePushNotifications(accountId: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    console.log('Not a native platform, skipping mobile push init');
    return false;
  }

  const Push = await loadPushPlugin();
  if (!Push) return false;

  try {
    // Request permission
    const permission = await Push.requestPermissions();

    if (permission.receive !== 'granted') {
      console.log('Push notification permission not granted');
      return false;
    }

    // Register with FCM/APNs
    await Push.register();

    // Token received
    Push.addListener('registration', async (token) => {
      console.log('Push registration success, token:', token.value);

      const { error } = await supabase.functions.invoke('register-device-token', {
        body: {
          token: token.value,
          platform: Capacitor.getPlatform() as 'android' | 'ios',
          accountId,
          deviceInfo: {
            platform: Capacitor.getPlatform(),
            isNative: true,
          },
        },
      });

      if (error) {
        console.error('Error registering mobile push token:', error);
      }
    });

    // Registration error
    Push.addListener('registrationError', (error) => {
      console.error('Push registration error:', error);
    });

    // Notification received in foreground
    Push.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received in foreground:', notification);

      // Dispatch custom event for the app to handle
      const type = notification.data?.type;
      window.dispatchEvent(
        new CustomEvent('push-notification', {
          detail: {
            type,
            title: notification.title,
            body: notification.body,
            data: notification.data,
          },
        })
      );

      // Type-specific handling
      switch (type) {
        case 'expense_pending_approval':
          window.dispatchEvent(new CustomEvent('refresh-expenses'));
          break;
        case 'budget_exceeded':
        case 'budget_threshold_90':
          window.dispatchEvent(new CustomEvent('budget-alert'));
          break;
        case 'invitation_received':
          window.dispatchEvent(new CustomEvent('refresh-invitations'));
          break;
        default:
          break;
      }
    });

    // Notification tapped (action performed)
    Push.addListener('pushNotificationActionPerformed', async (action) => {
      console.log('Push action performed:', action);

      const data = action.notification.data;
      if (data?.actionUrl) {
        // Navigate to the action URL
        window.location.href = data.actionUrl;
      }
    });

    console.log('Mobile push notifications initialized');
    return true;
  } catch (error) {
    console.error('Error initializing mobile push:', error);
    return false;
  }
}

/**
 * Get the count of delivered notifications (badge count)
 */
export async function getBadgeCount(): Promise<number> {
  if (!Capacitor.isNativePlatform()) return 0;

  const Push = await loadPushPlugin();
  if (!Push) return 0;

  try {
    const result = await Push.getDeliveredNotifications();
    return result.notifications.length;
  } catch {
    return 0;
  }
}

/**
 * Clear all delivered notifications and reset badge
 */
export async function clearBadge(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const Push = await loadPushPlugin();
  if (!Push) return;

  try {
    await Push.removeAllDeliveredNotifications();
  } catch (error) {
    console.error('Error clearing badge:', error);
  }
}

/**
 * Check if push notifications are available on this platform
 */
export function isMobilePushAvailable(): boolean {
  return Capacitor.isNativePlatform();
}
