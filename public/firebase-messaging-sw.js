/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */

/**
 * Firebase Cloud Messaging Service Worker
 * Handles background push notifications for web platform
 */
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Fallback Firebase config (used if postMessage config is not received)
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBcPHGwMs2feVqkskIxuReytW3e0HG7WQE",
  authDomain: "mh-plus-abba1.firebaseapp.com",
  projectId: "mh-plus-abba1",
  storageBucket: "mh-plus-abba1.firebasestorage.app",
  messagingSenderId: "876019710984",
  appId: "1:876019710984:web:d5d9e2a98f278b633425bd",
};

let isInitialized = false;

// Initialize immediately with default config
initializeFirebase(DEFAULT_FIREBASE_CONFIG);

// Also listen for config from main app (in case it sends updated config)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    if (!isInitialized) {
      initializeFirebase(event.data.config);
    }
  }
});

function initializeFirebase(config) {
  if (isInitialized || !config) return;
  
  try {
    firebase.initializeApp(config);
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

    isInitialized = true;
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
