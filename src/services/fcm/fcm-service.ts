/**
 * Unified FCM Service
 * Auto-detects platform and delegates to the correct implementation
 */
import { Capacitor } from '@capacitor/core';
// fcm-web is dynamically imported to avoid loading Firebase SDK at module level
type FcmWebModule = typeof import('./fcm-web');
let _fcmWeb: FcmWebModule | null = null;
async function loadFcmWeb(): Promise<FcmWebModule> {
  if (!_fcmWeb) {
    _fcmWeb = await import('./fcm-web');
  }
  return _fcmWeb;
}
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
export async function detectPlatform(): Promise<PushPlatform> {
  if (Capacitor.isNativePlatform()) {
    return Capacitor.getPlatform() as 'android' | 'ios';
  }
  const fcmWeb = await loadFcmWeb();
  if (fcmWeb.isPushSupported()) {
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
  const platform = await detectPlatform();

  if (platform === 'unsupported') {
    return { success: false, platform };
  }

  if (platform === 'web') {
    const fcmWeb = await loadFcmWeb();
    const hasPermission = fcmWeb.getPermissionStatus() === 'granted';
    if (hasPermission) {
      const token = await fcmWeb.getFCMToken(accountId);
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
  const platform = await detectPlatform();
  if (platform === 'unsupported') return false;

  if (platform === 'web') {
    const fcmWeb = await loadFcmWeb();
    const granted = await fcmWeb.requestNotificationPermission();
    if (granted) {
      await fcmWeb.getFCMToken(accountId);
    }
    return granted;
  }

  // Mobile
  return initializePushNotifications(accountId);
}

/**
 * Check if the user has granted notification permission
 */
export async function hasPermission(): Promise<boolean> {
  const platform = await detectPlatform();
  if (platform === 'web') {
    const fcmWeb = await loadFcmWeb();
    return fcmWeb.getPermissionStatus() === 'granted';
  }
  if (platform === 'android' || platform === 'ios') {
    // On mobile, if we successfully registered, permission was granted
    // This will be tracked by the NotificationContext
    return true;
  }
  return false;
}

// Re-export web utilities as async loaders to preserve lazy loading
export async function isPushSupported(): Promise<boolean> {
  const fcmWeb = await loadFcmWeb();
  return fcmWeb.isPushSupported();
}
export async function getPermissionStatus(): Promise<string> {
  const fcmWeb = await loadFcmWeb();
  return fcmWeb.getPermissionStatus();
}
export async function getFCMToken(accountId: string): Promise<string | null> {
  const fcmWeb = await loadFcmWeb();
  return fcmWeb.getFCMToken(accountId);
}
export async function onForegroundMessage(callback: (payload: unknown) => void): Promise<() => void> {
  const fcmWeb = await loadFcmWeb();
  return fcmWeb.onForegroundMessage(callback);
}
export async function unregisterToken(): Promise<void> {
  const fcmWeb = await loadFcmWeb();
  return fcmWeb.unregisterToken();
}

// Re-export mobile utilities (no Firebase dependency, safe to import statically)
export {
  getBadgeCount,
  clearBadge,
  isMobilePushAvailable,
};
