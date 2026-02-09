/**
 * Notification Permission Prompt
 * Floating card that appears when the user hasn't granted notification permission
 */
import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const DISMISS_KEY = 'notification_prompt_dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function NotificationPermissionPrompt() {
  const { isAuthenticated } = useAuth();
  const { hasPermission, isSupported, requestPermission, isInitializing } = useNotifications();
  const [dismissed, setDismissed] = useState(true); // Start hidden to avoid flash
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    // Only show after user is authenticated
    if (!isAuthenticated) {
      setDismissed(true);
      return;
    }

    // Check if previously dismissed (within the dismiss duration)
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < DISMISS_DURATION_MS) {
        setDismissed(true);
        return;
      }
    }
    // Show the prompt after a short delay to avoid flash
    const timer = setTimeout(() => {
      setDismissed(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  // Don't show if not authenticated, already has permission, not supported, initializing, or dismissed
  if (!isAuthenticated || hasPermission || !isSupported || isInitializing || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        setDismissed(true);
      }
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <Card className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 p-4 shadow-lg z-50 bg-white dark:bg-gray-800 border border-border/50 animate-fade-in">
      <div className="flex items-start gap-3" dir="rtl">
        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
          <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm mb-1">קבל התראות בזמן אמת</h3>
          <p className="text-xs text-muted-foreground mb-3">
            השאר מעודכן על חיובים חדשים, אישורים ועדכונים חשובים במשפחה
          </p>

          <div className="flex gap-2">
            <Button
              onClick={handleRequestPermission}
              size="sm"
              className="flex-1"
              disabled={isRequesting}
            >
              {isRequesting ? 'מאשר...' : 'אפשר התראות'}
            </Button>
            <Button onClick={handleDismiss} variant="ghost" size="sm">
              לא עכשיו
            </Button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
          aria-label="סגור"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}
