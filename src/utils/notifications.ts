
import { toast } from 'sonner';

export const showInvitationNotification = (invitationId: string) => {
  toast.info(
    `יש לך הזמנה לחשבון משותף! לצפייה לחץ: /invitation/${invitationId}`, 
    { duration: 10000 }
  );
};

export const showPendingInvitationsNotification = () => {
  toast.info(
    `יש לך הזמנות לחשבונות משותפים! לצפייה לחץ: /account-settings`,
    { duration: 10000 }
  );
};
