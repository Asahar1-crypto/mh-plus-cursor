/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */

/**
 * Firebase Cloud Messaging Service Worker
 * Handles background push notifications for web platform
 * 
 * NOTE: Replace the firebaseConfig values with your actual Firebase project config.
 * These are loaded from environment at build time (see .env).
 */
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase config - will be populated by the main app via postMessage
let firebaseConfig = null;

// Listen for config from main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    firebaseConfig = event.data.config;
    initializeFirebase();
  }
});

function initializeFirebase() {
  if (!firebaseConfig) return;
  
  try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    // Background message handler
    messaging.onBackgroundMessage((payload) => {
      console.log('[SW] Background message received:', payload);

      const notificationTitle = payload.notification?.title || 'התראה חדשה';
      const notificationOptions = {
        body: payload.notification?.body || '',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        data: payload.data || {},
        vibrate: [200, 100, 200],
        tag: payload.data?.type || 'default',
        requireInteraction: false,
        dir: 'rtl',
        lang: 'he',
      };

      return self.registration.showNotification(notificationTitle, notificationOptions);
    });

    console.log('[SW] Firebase messaging initialized successfully');
  } catch (error) {
    console.error('[SW] Error initializing Firebase:', error);
  }
}

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event.notification.data);
  event.notification.close();

  const actionUrl = event.notification.data?.actionUrl || '/dashboard';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus an existing window
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              data: event.notification.data,
              actionUrl,
            });
            return;
          }
        }
        // Open a new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(actionUrl);
        }
      })
  );
});
