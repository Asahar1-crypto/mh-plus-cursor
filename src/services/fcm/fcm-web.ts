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
 * Initialize Firebase only when needed and only if supported
 */
function getFirebaseMessaging(): Messaging | null {
  if (messaging) return messaging;

  // Check browser support
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    console.warn('Push notifications not supported in this browser');
    return null;
  }

  // Check if config is set
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn('Firebase config not set. Push notifications disabled.');
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
 * Check if push notifications are supported in the current browser
 */
export function isPushSupported(): boolean {
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    !!firebaseConfig.apiKey
  );
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
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
  console.log('[FCM] getFCMToken called for account:', accountId);
  
  const msg = getFirebaseMessaging();
  if (!msg) {
    console.warn('[FCM] Firebase messaging not available');
    return null;
  }

  try {
    // Register service worker
    console.log('[FCM] Registering service worker...');
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('[FCM] Service worker registered, waiting for ready...');
    await navigator.serviceWorker.ready;
    console.log('[FCM] Service worker ready');

    // Send Firebase config to the service worker
    // Wait a moment for the SW to activate if it's new
    const sw = registration.active || registration.installing || registration.waiting;
    if (sw) {
      sw.postMessage({
        type: 'FIREBASE_CONFIG',
        config: firebaseConfig,
      });
      console.log('[FCM] Config sent to service worker');
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn('[FCM] VITE_FIREBASE_VAPID_KEY not set');
      return null;
    }
    console.log('[FCM] Requesting FCM token with VAPID key...');

    const token = await getToken(msg, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log('[FCM] Token received:', token.substring(0, 20) + '...');
      
      // Save token to backend
      console.log('[FCM] Saving token to backend...');
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
        console.error('[FCM] Error registering device token:', error);
      } else {
        console.log('[FCM] Token registered successfully:', data);
      }

      return token;
    }

    console.warn('[FCM] No token received from Firebase');
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
    console.log('Foreground message received:', payload);
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
    console.log('Device token deactivated');
  } catch (error) {
    console.error('Error unregistering token:', error);
  }
}
