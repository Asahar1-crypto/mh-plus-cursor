/**
 * Capacitor Platform Initialization
 * Handles platform-specific setup for Android and iOS
 */
import { Capacitor } from '@capacitor/core';

/**
 * Apply safe area CSS variables for notch/dynamic island devices
 */
function applySafeArea() {
  const root = document.documentElement;
  root.style.setProperty('--safe-area-top', 'env(safe-area-inset-top)');
  root.style.setProperty('--safe-area-bottom', 'env(safe-area-inset-bottom)');
  root.style.setProperty('--safe-area-left', 'env(safe-area-inset-left)');
  root.style.setProperty('--safe-area-right', 'env(safe-area-inset-right)');
}

/**
 * Initialize StatusBar plugin for native platforms
 */
async function initStatusBar() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0F172A' });

    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setOverlaysWebView({ overlay: false });
    }
  } catch (error) {
    console.warn('StatusBar plugin not available:', error);
  }
}

/**
 * Initialize Keyboard plugin for native platforms
 */
async function initKeyboard() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { Keyboard } = await import('@capacitor/keyboard');

    // On iOS, scroll into view when keyboard appears
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-open');
    });

    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-open');
    });
  } catch (error) {
    console.warn('Keyboard plugin not available:', error);
  }
}

/**
 * Handle hardware back button on Android
 */
async function initBackButton() {
  if (Capacitor.getPlatform() !== 'android') return;

  try {
    const { App } = await import('@capacitor/app');
    
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.minimizeApp();
      }
    });
  } catch (error) {
    console.warn('App plugin not available:', error);
  }
}

/**
 * Handle deep links
 */
async function initDeepLinks() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { App } = await import('@capacitor/app');

    App.addListener('appUrlOpen', (event) => {
      const url = new URL(event.url);
      const path = url.pathname;
      
      // Handle deep link navigation
      if (path) {
        window.location.href = path + url.search;
      }
    });
  } catch (error) {
    console.warn('Deep links not available:', error);
  }
}

/**
 * Add platform-specific CSS classes to body
 */
function addPlatformClasses() {
  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();
  
  document.body.classList.add(`platform-${platform}`);
  
  if (isNative) {
    document.body.classList.add('native-app');
  } else {
    document.body.classList.add('web-app');
  }

  // Detect if running as standalone PWA
  if (window.matchMedia('(display-mode: standalone)').matches) {
    document.body.classList.add('standalone');
  }
}

/**
 * Disable context menu and selection on native for a more native feel
 */
function disableWebBehaviorsOnNative() {
  if (!Capacitor.isNativePlatform()) return;

  // Prevent pull-to-refresh on Android
  document.body.style.overscrollBehavior = 'none';
}

/**
 * Main initialization function - call this on app startup
 */
export async function initializeApp() {
  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();

  console.log(`[Capacitor] Platform: ${platform}, Native: ${isNative}`);

  // Apply safe area CSS variables
  applySafeArea();

  // Add platform CSS classes
  addPlatformClasses();

  if (isNative) {
    // Native-specific behaviors
    disableWebBehaviorsOnNative();

    // Initialize native plugins (non-blocking)
    await Promise.allSettled([
      initStatusBar(),
      initKeyboard(),
      initBackButton(),
      initDeepLinks(),
    ]);

    console.log('[Capacitor] Native plugins initialized');
  }
}

/**
 * Utility: Check if we're on a native platform
 */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Utility: Get current platform
 */
export function getPlatform(): 'web' | 'ios' | 'android' {
  return Capacitor.getPlatform() as 'web' | 'ios' | 'android';
}
