/**
 * Notification Settings Component
 * Full notification preferences management UI
 */
import React from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bell, Moon, Smartphone, Mail, MessageSquare, AlertCircle } from 'lucide-react';
import { NOTIFICATION_TYPE_LABELS, DEFAULT_PREFERENCES } from '@/services/notifications/types';
import type { ChannelPreference } from '@/services/notifications/types';

export function NotificationSettings() {
  const {
    preferences,
    updatePreferences,
    hasPermission,
    isSupported,
    requestPermission,
    platform,
  } = useNotifications();

  // Notification types to show in settings (most important ones)
  const notificationTypes = [
    'expense_pending_approval',
    'expense_approved',
    'expense_rejected',
    'budget_exceeded',
    'budget_threshold_90',
    'monthly_settlement_ready',
    'payment_due',
    'invitation_received',
    'new_family_member',
  ];

  const getTypePrefs = (key: string): ChannelPreference => {
    return (
      preferences?.preferences?.[key] ||
      DEFAULT_PREFERENCES[key] || { push: true, sms: false, email: false }
    );
  };

  const handleTypePrefsChange = (key: string, channel: keyof ChannelPreference, value: boolean) => {
    const currentPrefs = preferences?.preferences || {};
    const currentType = getTypePrefs(key);
    const newPrefs = {
      ...currentPrefs,
      [key]: { ...currentType, [channel]: value },
    };
    updatePreferences({ preferences: newPrefs } as any);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Permission status */}
      {isSupported && !hasPermission && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                  התראות Push לא מופעלות
                </p>
                {typeof Notification !== 'undefined' && Notification.permission === 'denied' ? (
                  <div>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">
                      ההתראות חסומות בדפדפן. כדי לאפשר:
                    </p>
                    <ol className="text-xs text-amber-700 dark:text-amber-300 mb-3 list-decimal list-inside space-y-1">
                      <li>לחץ על אייקון המנעול בשורת הכתובת</li>
                      <li>מצא "Notifications" ושנה ל-"Allow"</li>
                      <li>רענן את הדף</li>
                    </ol>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                      אפשר התראות כדי לקבל עדכונים בזמן אמת על חיובים, אישורים ועוד
                    </p>
                    <Button
                      onClick={requestPermission}
                      size="sm"
                      variant="outline"
                      className="border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/30"
                    >
                      <Bell className="h-4 w-4 ml-2" />
                      אפשר התראות
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main channel toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            ערוצי התראות
          </CardTitle>
          <CardDescription>בחר באילו ערוצים תרצה לקבל התראות</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="push-enabled">התראות Push</Label>
              {platform !== 'unsupported' && (
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {platform === 'web' ? 'דפדפן' : platform === 'android' ? 'אנדרואיד' : 'iOS'}
                </span>
              )}
            </div>
            <Switch
              id="push-enabled"
              checked={(preferences?.push_enabled ?? true) && hasPermission}
              onCheckedChange={async (checked) => {
                if (checked && !hasPermission) {
                  // Request browser permission first
                  const granted = await requestPermission();
                  if (!granted) return;
                }
                updatePreferences({ push_enabled: checked } as any);
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="sms-enabled">SMS</Label>
            </div>
            <Switch
              id="sms-enabled"
              checked={preferences?.sms_enabled ?? true}
              onCheckedChange={(checked) => updatePreferences({ sms_enabled: checked } as any)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="email-enabled">אימייל</Label>
            </div>
            <Switch
              id="email-enabled"
              checked={preferences?.email_enabled ?? true}
              onCheckedChange={(checked) => updatePreferences({ email_enabled: checked } as any)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quiet hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Moon className="h-5 w-5" />
            שעות שקט
          </CardTitle>
          <CardDescription>בשעות אלו לא יישלחו התראות Push</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="quiet-enabled">אל תפריע בשעות אלו</Label>
            <Switch
              id="quiet-enabled"
              checked={preferences?.quiet_hours_enabled ?? false}
              onCheckedChange={(checked) =>
                updatePreferences({ quiet_hours_enabled: checked } as any)
              }
            />
          </div>

          {preferences?.quiet_hours_enabled && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <Label htmlFor="quiet-start" className="text-xs text-muted-foreground">
                  מ-
                </Label>
                <Input
                  id="quiet-start"
                  type="time"
                  value={preferences.quiet_hours_start || '22:00'}
                  onChange={(e) =>
                    updatePreferences({ quiet_hours_start: e.target.value } as any)
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="quiet-end" className="text-xs text-muted-foreground">
                  עד-
                </Label>
                <Input
                  id="quiet-end"
                  type="time"
                  value={preferences.quiet_hours_end || '07:00'}
                  onChange={(e) =>
                    updatePreferences({ quiet_hours_end: e.target.value } as any)
                  }
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-type preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">התראות לפי סוג</CardTitle>
          <CardDescription>בחר אילו התראות תקבל ובאילו ערוצים</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {notificationTypes.map((key) => {
              const label = NOTIFICATION_TYPE_LABELS[key] || key;
              const typePrefs = getTypePrefs(key);

              return (
                <div key={key} className="border-b border-border/50 pb-3 last:border-0 last:pb-0">
                  <div className="font-medium text-sm mb-2">{label}</div>
                  <div className="flex gap-4 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={typePrefs.push}
                        onChange={(e) => handleTypePrefsChange(key, 'push', e.target.checked)}
                        className="rounded border-gray-300"
                        disabled={!hasPermission || !(preferences?.push_enabled ?? true)}
                      />
                      <span className="text-muted-foreground">Push</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={typePrefs.sms}
                        onChange={(e) => handleTypePrefsChange(key, 'sms', e.target.checked)}
                        className="rounded border-gray-300"
                        disabled={!(preferences?.sms_enabled ?? true)}
                      />
                      <span className="text-muted-foreground">SMS</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={typePrefs.email}
                        onChange={(e) => handleTypePrefsChange(key, 'email', e.target.checked)}
                        className="rounded border-gray-300"
                        disabled={!(preferences?.email_enabled ?? true)}
                      />
                      <span className="text-muted-foreground">אימייל</span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
