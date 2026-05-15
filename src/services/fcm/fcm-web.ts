/**
 * Firebase Cloud Messaging - Web Implementation
 * Handles push notifications for web browsers
 */
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';
import { supabase } from '@/integrations/supabase/client';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let messaging: Messaging | null = null;

/**
 * Is the user on an iOS browser (Safari on iPhone/iPad)?
 * iPadOS 13+ masquerades as macOS, so we also check `maxTouchPoints` on MacIntel.
 */
export function isIOSBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return true;
  const nav = navigator as Navigator & { maxTouchPoints?: number };
  return nav.platform === 'MacIntel' && (nav.maxTouchPoints ?? 0) > 1;
}

/**
 * Is the app running as an installed PWA (Add to Home Screen)?
 * iOS Web Push requires this — Safari tab will silently fail to deliver.
 */
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

/**
 * Granular push-support status. Used by callers to show the right UX.
 * - "no-notification-api": ancient browser
 * - "no-service-worker": SW not available (private mode, etc.)
 * - "no-push-manager": browser lacks Web Push (older iOS, etc.)
 * - "no-firebase-config": env var missing
 * - "ios-not-installed": iOS Safari but PWA not added to home screen
 *   → notifications will NOT arrive even if permission granted
 */
export type PushSupportStatus =
  | { supported: true }
  | {
      supported: false;
      reason:
        | 'no-notification-api'
        | 'no-service-worker'
        | 'no-push-manager'
        | 'no-firebase-config'
        | 'ios-not-installed';
    };

export function getPushSupportStatus(): PushSupportStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { supported: false, reason: 'no-notification-api' };
  }
  if (!('serviceWorker' in navigator)) {
    return { supported: false, reason: 'no-service-worker' };
  }
  if (!('PushManager' in window)) {
    return { supported: false, reason: 'no-push-manager' };
  }
  if (!firebaseConfig.apiKey) {
    return { supported: false, reason: 'no-firebase-config' };
  }
  if (isIOSBrowser() && !isStandalonePWA()) {
    // iOS 16.4+ Web Push only works for installed PWAs. Registering a token in
    // plain Safari succeeds silently but no notification ever arrives.
    return { supported: false, reason: 'ios-not-installed' };
  }
  return { supported: true };
}

/**
 * Initialize Firebase only when needed and only if supported
 */
function getFirebaseMessaging(): Messaging | null {
  if (messaging) return messaging;

  // Check browser support
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return null;
  }

  // Check if config is set
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    return null;
  }

  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    messaging = getMessaging(app);
    return messaging;
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    return null;
  }
}

/**
 * Check if push notifications are supported in the current browser.
 * Returns false on iOS Safari unless the app is installed to the home screen —
 * registering a token in regular Safari succeeds but delivery silently fails.
 */
export function isPushSupported(): boolean {
  return getPushSupportStatus().supported;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Get current notification permission status
 */
export function getPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/**
 * Register service worker and get FCM token, then save to backend
 */
export async function getFCMToken(accountId: string): Promise<string | null> {
  // Fail closed for iOS-not-installed: registering a token here would succeed
  // silently but FCM/APNs never delivers, so the user appears to have working
  // push when they don't. Surface this as no token so callers show the install UX.
  const status = getPushSupportStatus();
  if (!status.supported) {
    if (status.reason === 'ios-not-installed') {
      console.warn('[FCM] iOS Safari detected outside PWA — Web Push requires Add to Home Screen');
    }
    return null;
  }

  const msg = getFirebaseMessaging();
  if (!msg) {
    return null;
  }

  try {
    // Register service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;

    // Send Firebase config to the service worker
    const sw = registration.active || registration.installing || registration.waiting;
    if (sw) {
      sw.postMessage({
        type: 'FIREBASE_CONFIG',
        config: firebaseConfig,
      });
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      return null;
    }

    const token = await getToken(msg, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (token) {

      const { data, error } = await supabase.functions.invoke('register-device-token', {
        body: {
          token,
          platform: 'web',
          accountId,
          deviceInfo: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
          },
        },
      });

      if (error) {
        console.error('[FCM] Error registering device token with backend - token not saved:', error);
        return null;
      }

      return token;
    }

    return null;
  } catch (error) {
    console.error('[FCM] Error getting FCM token:', error);
    return null;
  }
}

/**
 * Listen for foreground messages
 * Returns an unsubscribe function
 */
export function onForegroundMessage(callback: (payload: any) => void): () => void {
  const msg = getFirebaseMessaging();
  if (!msg) return () => {};

  return onMessage(msg, (payload) => {
    callback(payload);
  });
}

/**
 * Deactivate a device token in the backend
 */
export async function unregisterToken(token: string): Promise<void> {
  try {
    await supabase
      .from('device_tokens')
      .update({ is_active: false })
      .eq('token', token);
  } catch (error) {
    console.error('Error unregistering token:', error);
  }
}
