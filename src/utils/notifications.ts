import { toast } from 'sonner';
import { PendingInvitationRecord } from '@/contexts/auth/services/invitation/types';

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

// Helper to check if we have pending invitations for the current user
export const hasPendingInvitations = (currentUserEmail?: string): boolean => {
  const pendingInvitationsData = localStorage.getItem('pendingInvitations');
  if (!pendingInvitationsData) return false;
  
  try {
    const pendingInvitations = JSON.parse(pendingInvitationsData);
    
    // אם לא סופק אימייל משתמש, נבדוק רק אם יש הזמנות כלשהן
    if (!currentUserEmail) {
      return Object.keys(pendingInvitations).length > 0;
    }
    
    // בדיקה אם יש הזמנה שמתאימה לאימייל המשתמש הנוכחי
    return Object.values(pendingInvitations).some(
      (invitation: any) => 
        invitation.sharedWithEmail && 
        invitation.sharedWithEmail.toLowerCase() === currentUserEmail.toLowerCase()
    );
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

// Clear all pending invitations that don't match the current user's email
export const clearInvalidInvitations = (currentUserEmail: string): void => {
  const pendingInvitationsData = localStorage.getItem('pendingInvitations');
  if (!pendingInvitationsData) return;
  
  try {
    const pendingInvitations = JSON.parse(pendingInvitationsData) as Record<string, PendingInvitationRecord>;
    let hasChanges = false;
    
    Object.entries(pendingInvitations).forEach(([invitationId, invitation]) => {
      // אם ההזמנה שייכת למשתמש אחר, מוחקים אותה
      if (invitation.sharedWithEmail && 
          invitation.sharedWithEmail.toLowerCase() !== currentUserEmail.toLowerCase()) {
        delete pendingInvitations[invitationId];
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      localStorage.setItem('pendingInvitations', JSON.stringify(pendingInvitations));
      console.log(`Cleared invalid invitations for user ${currentUserEmail}`);
    }
  } catch (error) {
    console.error('Failed to clear invalid invitations:', error);
  }
};

// Clear all pending invitations from localStorage
export const clearAllPendingInvitations = (): void => {
  try {
    localStorage.removeItem('pendingInvitations');
    localStorage.removeItem('pendingInvitationsAfterRegistration');
    sessionStorage.removeItem('pendingInvitationId');
    sessionStorage.removeItem('pendingInvitationAccountId');
    console.log('All pending invitations cleared from storage');
    toast.success('רשימת ההזמנות נוקתה בהצלחה');
  } catch (error) {
    console.error('Failed to clear pending invitations:', error);
    toast.error('אירעה שגיאה בניקוי רשימת ההזמנות');
  }
};
