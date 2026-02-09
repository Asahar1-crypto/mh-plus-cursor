/**
 * Push Notification Types & Constants
 * Family Finance+ Notification System
 */

export enum NotificationType {
  EXPENSE_PENDING_APPROVAL = 'expense_pending_approval',
  EXPENSE_APPROVED = 'expense_approved',
  EXPENSE_REJECTED = 'expense_rejected',
  EXPENSE_PAID = 'expense_paid',
  BUDGET_THRESHOLD_75 = 'budget_threshold_75',
  BUDGET_THRESHOLD_90 = 'budget_threshold_90',
  BUDGET_EXCEEDED = 'budget_exceeded',
  MONTHLY_SETTLEMENT_READY = 'monthly_settlement_ready',
  INVITATION_RECEIVED = 'invitation_received',
  RECURRING_EXPENSE_CREATED = 'recurring_expense_created',
  PAYMENT_DUE = 'payment_due',
  SUBSCRIPTION_EXPIRING = 'subscription_expiring',
  NEW_FAMILY_MEMBER = 'new_family_member',
  ACCOUNT_ACTIVITY = 'account_activity',
}

export type NotificationChannel = 'push' | 'sms' | 'email';
export type NotificationPlatform = 'web' | 'android' | 'ios';
export type NotificationStatus = 'sent' | 'delivered' | 'failed' | 'clicked';

export interface ChannelPreference {
  push: boolean;
  sms: boolean;
  email: boolean;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  account_id: string | null;
  push_enabled: boolean;
  sms_enabled: boolean;
  email_enabled: boolean;
  preferences: Record<string, ChannelPreference>;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  created_at: string;
  updated_at: string;
}

export interface DeviceToken {
  id: string;
  user_id: string;
  account_id: string | null;
  token: string;
  platform: NotificationPlatform;
  device_info: Record<string, unknown>;
  is_active: boolean;
  last_used_at: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationLog {
  id: string;
  user_id: string | null;
  account_id: string | null;
  notification_type: string;
  channel: NotificationChannel;
  title: string | null;
  body: string | null;
  data: Record<string, unknown>;
  status: NotificationStatus;
  platform: NotificationPlatform | null;
  device_token_id: string | null;
  error_message: string | null;
  fcm_message_id: string | null;
  sent_at: string;
  delivered_at: string | null;
  clicked_at: string | null;
  created_at: string;
}

export interface NotificationPayload {
  userId: string;
  accountId: string;
  type: NotificationType | string;
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  actionUrl?: string;
}

/** Hebrew labels for notification types (used in settings UI) */
export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  [NotificationType.EXPENSE_PENDING_APPROVAL]: 'חיוב ממתין לאישור',
  [NotificationType.EXPENSE_APPROVED]: 'חיוב אושר',
  [NotificationType.EXPENSE_REJECTED]: 'חיוב נדחה',
  [NotificationType.EXPENSE_PAID]: 'חיוב שולם',
  [NotificationType.BUDGET_THRESHOLD_75]: 'תקציב הגיע ל-75%',
  [NotificationType.BUDGET_THRESHOLD_90]: 'תקציב הגיע ל-90%',
  [NotificationType.BUDGET_EXCEEDED]: 'תקציב חרג',
  [NotificationType.MONTHLY_SETTLEMENT_READY]: 'סיכום חודשי מוכן',
  [NotificationType.INVITATION_RECEIVED]: 'הזמנה התקבלה',
  [NotificationType.RECURRING_EXPENSE_CREATED]: 'הוצאה קבועה נוצרה',
  [NotificationType.PAYMENT_DUE]: 'תשלום לביצוע',
  [NotificationType.SUBSCRIPTION_EXPIRING]: 'מנוי עומד לפוג',
  [NotificationType.NEW_FAMILY_MEMBER]: 'בן משפחה חדש הצטרף',
  [NotificationType.ACCOUNT_ACTIVITY]: 'פעילות בחשבון',
};

/** Default channel preferences per notification type */
export const DEFAULT_PREFERENCES: Record<string, ChannelPreference> = {
  [NotificationType.EXPENSE_PENDING_APPROVAL]: { push: true, sms: false, email: true },
  [NotificationType.EXPENSE_APPROVED]: { push: true, sms: false, email: false },
  [NotificationType.EXPENSE_REJECTED]: { push: true, sms: false, email: true },
  [NotificationType.EXPENSE_PAID]: { push: true, sms: false, email: false },
  [NotificationType.BUDGET_THRESHOLD_75]: { push: true, sms: false, email: false },
  [NotificationType.BUDGET_THRESHOLD_90]: { push: true, sms: false, email: true },
  [NotificationType.BUDGET_EXCEEDED]: { push: true, sms: true, email: true },
  [NotificationType.MONTHLY_SETTLEMENT_READY]: { push: true, sms: false, email: true },
  [NotificationType.INVITATION_RECEIVED]: { push: true, sms: true, email: true },
  [NotificationType.RECURRING_EXPENSE_CREATED]: { push: true, sms: false, email: false },
  [NotificationType.PAYMENT_DUE]: { push: true, sms: false, email: true },
  [NotificationType.SUBSCRIPTION_EXPIRING]: { push: true, sms: false, email: true },
  [NotificationType.NEW_FAMILY_MEMBER]: { push: true, sms: false, email: false },
  [NotificationType.ACCOUNT_ACTIVITY]: { push: true, sms: false, email: false },
};
