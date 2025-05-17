
import { toast } from 'sonner';

export const showInvitationNotification = (invitationId: string) => {
  toast.info(
    {
      title: 'יש לך הזמנה לחשבון משותף!',
      description: `לצפייה בהזמנה: /invitation/${invitationId}`
    },
    { duration: 15000 }
  );
};

export const showPendingInvitationsNotification = () => {
  toast.info(
    {
      title: 'יש לך הזמנות לחשבונות משותפים!',
      description: 'לצפייה לחץ: /account-settings'
    },
    { duration: 10000 }
  );
};
