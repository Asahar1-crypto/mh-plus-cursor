/**
 * Notification utility functions shared across edge functions
 */

/**
 * Check if a given time (HH:MM) is within quiet hours
 */
export function isInQuietHours(
  current: string,
  start: string,
  end: string
): boolean {
  if (start < end) {
    // Same day (e.g., 09:00 - 17:00)
    return current >= start && current < end;
  } else {
    // Overnight (e.g., 22:00 - 07:00)
    return current >= start || current < end;
  }
}

/**
 * Get current time in HH:MM format for a given timezone offset
 */
export function getCurrentTimeHHMM(timezoneOffset = 2): string {
  // Default offset 2 = Israel Standard Time (UTC+2)
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const local = new Date(utc + timezoneOffset * 3600000);
  return local.toTimeString().slice(0, 5);
}

/**
 * Validate a notification type string
 */
export function isValidNotificationType(type: string): boolean {
  const validTypes = [
    'expense_pending_approval',
    'expense_approved',
    'expense_rejected',
    'expense_paid',
    'budget_threshold_75',
    'budget_threshold_90',
    'budget_exceeded',
    'monthly_settlement_ready',
    'invitation_received',
    'recurring_expense_created',
    'payment_due',
    'subscription_expiring',
    'new_family_member',
    'account_activity',
  ];
  return validTypes.includes(type);
}
