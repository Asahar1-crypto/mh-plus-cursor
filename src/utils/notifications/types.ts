
import { PendingInvitationRecord } from '@/contexts/auth/services/invitation/types';

/**
 * Type definitions for notification system
 */
export interface NotificationOptions {
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface InvitationNotificationData {
  id: string;
  ownerName: string;
  accountName: string;
  email: string;
}
