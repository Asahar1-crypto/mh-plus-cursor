
import { toast } from 'sonner';

export const showInvitationNotification = (invitationId: string) => {
  toast.info(
    "יש לך הזמנה לחשבון משותף!",
    {
      description: `לצפייה בהזמנה: /invitation/${invitationId}`,
      duration: 15000
    }
  );
};

export const showPendingInvitationsNotification = () => {
  toast.info(
    "יש לך הזמנות לחשבונות משותפים!",
    {
      description: 'לצפייה לחץ: /account-settings',
      duration: 10000
    }
  );
};

// Helper to check if we have pending invitations
export const hasPendingInvitations = (): boolean => {
  const pendingInvitationsData = localStorage.getItem('pendingInvitations');
  if (!pendingInvitationsData) return false;
  
  try {
    const pendingInvitations = JSON.parse(pendingInvitationsData);
    return Object.keys(pendingInvitations).length > 0;
  } catch (error) {
    console.error('Failed to parse pending invitations:', error);
    return false;
  }
};

// Helper to remove a specific invitation from localStorage
export const removePendingInvitation = (invitationId: string): void => {
  const pendingInvitationsData = localStorage.getItem('pendingInvitations');
  if (!pendingInvitationsData) return;
  
  try {
    const pendingInvitations = JSON.parse(pendingInvitationsData);
    if (pendingInvitations[invitationId]) {
      delete pendingInvitations[invitationId];
      localStorage.setItem('pendingInvitations', JSON.stringify(pendingInvitations));
      console.log(`Removed invitation ${invitationId} from localStorage`);
    }
  } catch (error) {
    console.error('Failed to remove pending invitation:', error);
  }
};
