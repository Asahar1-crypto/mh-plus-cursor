/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */

/**
 * Firebase Cloud Messaging Service Worker
 * Handles background push notifications for web platform
 *
 * Security: Firebase config is received via postMessage from the main app.
 * No credentials are hardcoded in this file.
 */
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

let firebaseConfig = null;
let isInitialized = false;

// Notification types that should stay visible until the user acts on them.
// Mirrors URGENT_NOTIFICATION_TYPES in supabase/functions/_shared/notification-utils.ts
const URGENT_TYPES = ['expense_pending_approval', 'invitation_received', 'budget_exceeded'];

/**
 * Build showNotification options from an FCM payload, honoring backend hints
 * for tag (de-dup vs stack), requireInteraction (sticky for urgent types),
 * and falling back to a per-type tag when no explicit one is provided.
 */
function buildNotificationOptions(payload) {
  const data = payload.data || {};
  const type = data.type || 'default';

  // Unique tag prevents notifications of the same type from collapsing onto
  // each other. Backend may set `data.tag` explicitly; otherwise fall back
  // to a per-entity tag (expenseId, etc.) or random for true uniqueness.
  const tag =
    data.tag ||
    (data.expenseId ? `${type}_${data.expenseId}` : null) ||
    (data.id ? `${type}_${data.id}` : null) ||
    type;

  // Urgent types stick around (no auto-dismiss); routine types fade.
  const requireInteraction = URGENT_TYPES.includes(type) || data.requireInteraction === 'true';

  return {
    body: payload.notification?.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: data,
    vibrate: [200, 100, 200],
    tag,
    requireInteraction,
    dir: 'rtl',
    lang: 'he',
  };
}

// Receive config from main app via postMessage
self.addEventListener('message', (event) => {
  if (event.data?.type === 'FIREBASE_CONFIG') {
    firebaseConfig = event.data.config;
    if (!isInitialized && firebaseConfig) {
      try {
        firebase.initializeApp(firebaseConfig);
        isInitialized = true;
        const messaging = firebase.messaging();

        // Background message handler
        messaging.onBackgroundMessage((payload) => {
          console.log('[SW] Background message received:', payload);

          const notificationTitle = payload.notification?.title || '\u05D4\u05EA\u05E8\u05D0\u05D4 \u05D7\u05D3\u05E9\u05D4';
          const notificationOptions = buildNotificationOptions(payload);
          return self.registration.showNotification(notificationTitle, notificationOptions);
        });

        console.log('[SW] Firebase messaging initialized successfully');
      } catch (error) {
        console.error('[SW] Error initializing Firebase:', error);
      }
    }
  }
});

// Handle push events even without Firebase initialization (fallback)
self.addEventListener('push', (event) => {
  // If Firebase is initialized, onBackgroundMessage will handle it
  if (isInitialized) return;

  // Fallback: parse push data directly when config hasn't been received yet
  let data;
  try {
    data = event.data?.json();
  } catch (e) {
    console.warn('[SW] Could not parse push data:', e);
    return;
  }

  if (data?.notification) {
    event.waitUntil(
      self.registration.showNotification(
        data.notification.title || '\u05D4\u05EA\u05E8\u05D0\u05D4 \u05D7\u05D3\u05E9\u05D4',
        buildNotificationOptions(data),
      )
    );
  }
});

/**
 * Validate that a URL is safe to open (relative path only, no protocol injection).
 */
function isSafeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  // Only allow relative URLs starting with /
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return false;
  // Block javascript: and data: protocols
  if (/javascript:|data:/i.test(trimmed)) return false;
  return true;
}

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event.notification.data);
  event.notification.close();

  const rawUrl = event.notification.data?.actionUrl;
  const actionUrl = isSafeUrl(rawUrl) ? rawUrl.trim() : '/dashboard';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus an existing window
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            // Client picks this up and POSTs to log-notification-click so we
            // can track click-through rate without granting the SW direct
            // database access.
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              data: event.notification.data,
              actionUrl,
            });
            return;
          }
        }
        // No open window: queue the click so the client logs it once it boots.
        // The same NOTIFICATION_CLICK message will be replayed via session storage
        // on app start; here we just open the URL and rely on the actionUrl
        // query string to carry the notification id.
        const data = event.notification.data || {};
        const sep = actionUrl.includes('?') ? '&' : '?';
        const urlWithClick = data.notificationId
          ? `${actionUrl}${sep}notif=${encodeURIComponent(data.notificationId)}`
          : actionUrl;
        if (clients.openWindow) {
          return clients.openWindow(urlWithClick);
        }
      })
  );
});
