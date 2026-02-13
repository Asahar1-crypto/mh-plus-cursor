/**
 * Notification Context
 * Provides push notification state and actions to the entire app
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './auth';
import {
  initializePush,
  requestPermission as fcmRequestPermission,
  onForegroundMessage,
  detectPlatform,
  getPermissionStatus,
  type PushPlatform,
} from '@/services/fcm';
import { handleForegroundNotification, handleNotificationClick } from '@/services/notifications';
import type { NotificationPreferences } from '@/services/notifications/types';
import { supabase } from '@/integrations/supabase/client';

interface NotificationContextType {
  /** Whether the user has granted notification permission */
  hasPermission: boolean;
  /** Current push platform (web, android, ios, unsupported) */
  platform: PushPlatform;
  /** Whether push is supported on this platform */
  isSupported: boolean;
  /** Request notification permission from the user */
  requestPermission: () => Promise<boolean>;
  /** User's notification preferences */
  preferences: NotificationPreferences | null;
  /** Update notification preferences */
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  /** Reload preferences from database */
  refreshPreferences: () => Promise<void>;
  /** Unread notification count (foreground messages since last check) */
  unreadCount: number;
  /** Reset unread count */
  clearUnread: () => void;
  /** Whether the system is currently initializing */
  isInitializing: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, account } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [platform, setPlatform] = useState<PushPlatform>('unsupported');
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isInitializing, setIsInitializing] = useState(true);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const initializedRef = useRef(false);

  // Detect platform on mount
  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);
  }, []);

  // Initialize notifications when user and account are available
  useEffect(() => {
    if (!user || !account?.id) {
      setIsInitializing(false);
      return;
    }

    // Avoid double initialization
    if (initializedRef.current) return;
    initializedRef.current = true;

    const init = async () => {
      setIsInitializing(true);
      try {
        // Use detectPlatform() directly to avoid race with platform state
        const currentPlatform = detectPlatform();

        if (currentPlatform === 'web') {
          const status = getPermissionStatus();
          setHasPermission(status === 'granted');

          if (status === 'granted') {
            const result = await initializePush(account.id);
            if (result.success) {
              setupForegroundListener();
            }
          }
        } else if (currentPlatform === 'android' || currentPlatform === 'ios') {
          const result = await initializePush(account.id);
          setHasPermission(result.success);
        }

        // Load preferences
        await loadPreferences();
      } catch (error) {
        console.error('Error initializing notifications:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    init();

    // Listen for notification clicks from service worker
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        handleNotificationClick(event.data.data);
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
      initializedRef.current = false;
    };
  }, [user?.id, account?.id]);

  /**
   * Set up listener for foreground messages (web only)
   */
  const setupForegroundListener = useCallback(() => {
    // Clean up previous listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    unsubscribeRef.current = onForegroundMessage((payload) => {
      handleForegroundNotification(payload);
      setUnreadCount((prev) => prev + 1);
    });
  }, []);

  /**
   * Load notification preferences from database.
   * If none exist yet, create default preferences.
   */
  const loadPreferences = useCallback(async () => {
    if (!user || !account?.id) return;

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('account_id', account.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // No preferences found - create defaults
        // No preferences found - create defaults
        const { data: newData, error: insertError } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: user.id,
            account_id: account.id,
            push_enabled: true,
            sms_enabled: true,
            email_enabled: true,
            quiet_hours_enabled: false,
            quiet_hours_start: '22:00',
            quiet_hours_end: '07:00',
          })
          .select()
          .single();

        if (insertError) {
          console.error('[Notifications] Error creating default preferences:', insertError);
        } else if (newData) {
          setPreferences(newData as NotificationPreferences);
        }
        return;
      }

      if (error) {
        console.error('Error loading notification preferences:', error);
        return;
      }

      if (data) {
        setPreferences(data as NotificationPreferences);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  }, [user?.id, account?.id]);

  /**
   * Request notification permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!account?.id) {
      return false;
    }

    try {
      const granted = await fcmRequestPermission(account.id);
      setHasPermission(granted);

      if (granted && platform === 'web') {
        setupForegroundListener();
      }

      return granted;
    } catch (error) {
      console.error('[Notifications] Error requesting permission:', error);
      return false;
    }
  }, [account?.id, platform, setupForegroundListener]);

  /**
   * Update notification preferences
   */
  const updatePreferences = useCallback(
    async (prefs: Partial<NotificationPreferences>) => {
      if (!user || !account?.id) return;

      try {

        // Update directly via Supabase (faster, avoids edge function overhead)
        const { data, error } = await supabase
          .from('notification_preferences')
          .upsert(
            {
              user_id: user.id,
              account_id: account.id,
              ...prefs,
            },
            { onConflict: 'user_id,account_id' }
          )
          .select()
          .single();

        if (error) {
          console.error('[Notifications] Error updating preferences:', error);
          return;
        }

        // Update local state with the full returned data
        if (data) {
          setPreferences(data as NotificationPreferences);
        }
      } catch (error) {
        console.error('[Notifications] Error updating preferences:', error);
      }
    },
    [user?.id, account?.id]
  );

  /**
   * Refresh preferences from database
   */
  const refreshPreferences = useCallback(async () => {
    await loadPreferences();
  }, [loadPreferences]);

  /**
   * Clear unread count
   */
  const clearUnread = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const isSupported = platform !== 'unsupported';

  return (
    <NotificationContext.Provider
      value={{
        hasPermission,
        platform,
        isSupported,
        requestPermission,
        preferences,
        updatePreferences,
        refreshPreferences,
        unreadCount,
        clearUnread,
        isInitializing,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to access notification context
 */
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
