/**
 * Unified FCM Service
 * Auto-detects platform and delegates to the correct implementation
 */
import { Capacitor } from '@capacitor/core';
import {
  isPushSupported,
  requestNotificationPermission as webRequestPermission,
  getPermissionStatus,
  getFCMToken,
  onForegroundMessage,
  unregisterToken,
} from './fcm-web';
import {
  initializePushNotifications,
  getBadgeCount,
  clearBadge,
  isMobilePushAvailable,
} from './fcm-mobile';

export type PushPlatform = 'web' | 'android' | 'ios' | 'unsupported';

/**
 * Detect the current push notification platform
 */
export function detectPlatform(): PushPlatform {
  if (Capacitor.isNativePlatform()) {
    return Capacitor.getPlatform() as 'android' | 'ios';
  }
  if (isPushSupported()) {
    return 'web';
  }
  return 'unsupported';
}

/**
 * Initialize push notifications for the current platform
 */
export async function initializePush(accountId: string): Promise<{
  success: boolean;
  platform: PushPlatform;
  token?: string | null;
}> {
  const platform = detectPlatform();

  if (platform === 'unsupported') {
    console.log('Push notifications not supported on this platform');
    return { success: false, platform };
  }

  if (platform === 'web') {
    const hasPermission = getPermissionStatus() === 'granted';
    if (hasPermission) {
      const token = await getFCMToken(accountId);
      return { success: !!token, platform, token };
    }
    return { success: false, platform };
  }

  // Mobile (android/ios)
  const success = await initializePushNotifications(accountId);
  return { success, platform };
}

/**
 * Request notification permission (platform-agnostic)
 */
export async function requestPermission(accountId: string): Promise<boolean> {
  const platform = detectPlatform();
  console.log('[FCM Service] requestPermission called, platform:', platform);

  if (platform === 'unsupported') return false;

  if (platform === 'web') {
    console.log('[FCM Service] Requesting web notification permission...');
    const granted = await webRequestPermission();
    console.log('[FCM Service] Browser permission granted:', granted);
    if (granted) {
      console.log('[FCM Service] Getting FCM token...');
      const token = await getFCMToken(accountId);
      console.log('[FCM Service] FCM token result:', token ? 'received' : 'null');
    }
    return granted;
  }

  // Mobile
  return initializePushNotifications(accountId);
}

/**
 * Check if the user has granted notification permission
 */
export function hasPermission(): boolean {
  const platform = detectPlatform();
  if (platform === 'web') {
    return getPermissionStatus() === 'granted';
  }
  if (platform === 'android' || platform === 'ios') {
    // On mobile, if we successfully registered, permission was granted
    // This will be tracked by the NotificationContext
    return true;
  }
  return false;
}

// Re-export platform-specific utilities
export {
  isPushSupported,
  getPermissionStatus,
  getFCMToken,
  onForegroundMessage,
  unregisterToken,
  getBadgeCount,
  clearBadge,
  isMobilePushAvailable,
};
