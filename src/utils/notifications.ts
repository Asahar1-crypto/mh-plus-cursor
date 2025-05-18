
import { toast } from 'sonner';
import { PendingInvitationRecord } from '@/contexts/auth/services/invitation/types';

/**
 * Shows notification for a new invitation
 */
export const showInvitationNotification = (invitationId: string) => {
  // Check for invitation details in localStorage
  const pendingInvitationsData = localStorage.getItem('pendingInvitations');
  if (!pendingInvitationsData) return;
  
  try {
    const pendingInvitations = JSON.parse(pendingInvitationsData) as Record<string, PendingInvitationRecord>;
    const invitation = pendingInvitations[invitationId];
    
    if (!invitation) return;
    
    // Show notification with invitation details
    toast.info(
      `יש לך הזמנה לחשבון משותף מ-${invitation.ownerName}!`,
      {
        description: `לצפייה בהזמנה וקבלתה, לחץ על הכפתור למטה`,
        duration: 15000,
        action: {
          label: "צפה בהזמנה",
          onClick: () => {
            window.location.href = `/invitation/${invitationId}`;
          }
        }
      }
    );
  } catch (error) {
    console.error('Failed to parse pending invitations:', error);
  }
};

/**
 * Checks if there are pending invitations for the current user
 */
export const hasPendingInvitations = (currentUserEmail?: string): boolean => {
  const pendingInvitationsData = localStorage.getItem('pendingInvitations');
  if (!pendingInvitationsData) return false;
  
  try {
    const pendingInvitations = JSON.parse(pendingInvitationsData) as Record<string, PendingInvitationRecord>;
    
    // If no user email provided, just check if there are any invitations
    if (!currentUserEmail) {
      return Object.keys(pendingInvitations).length > 0;
    }
    
    // Check if there are invitations matching the current user's email
    return Object.values(pendingInvitations).some(
      invitation => 
        invitation.sharedWithEmail && 
        invitation.sharedWithEmail.toLowerCase() === currentUserEmail.toLowerCase()
    );
  } catch (error) {
    console.error('Failed to parse pending invitations:', error);
    return false;
  }
};

/**
 * Removes a specific invitation from localStorage
 */
export const removePendingInvitation = (invitationId: string): void => {
  const pendingInvitationsData = localStorage.getItem('pendingInvitations');
  if (!pendingInvitationsData) return;
  
  try {
    const pendingInvitations = JSON.parse(pendingInvitationsData) as Record<string, PendingInvitationRecord>;
    if (pendingInvitations[invitationId]) {
      delete pendingInvitations[invitationId];
      localStorage.setItem('pendingInvitations', JSON.stringify(pendingInvitations));
      console.log(`Removed invitation ${invitationId} from localStorage`);
    }
  } catch (error) {
    console.error('Failed to remove pending invitation:', error);
  }
};

/**
 * Clears invitations that don't match the current user
 */
export const clearInvalidInvitations = (currentUserEmail: string): void => {
  const pendingInvitationsData = localStorage.getItem('pendingInvitations');
  if (!pendingInvitationsData) return;
  
  try {
    const pendingInvitations = JSON.parse(pendingInvitationsData) as Record<string, PendingInvitationRecord>;
    let hasChanges = false;
    
    Object.entries(pendingInvitations).forEach(([invitationId, invitation]) => {
      // If the invitation belongs to another user, delete it
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

/**
 * Clears all pending invitations
 */
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

/**
 * Automatically checks for new invitations
 */
export const checkForNewInvitations = async (email: string) => {
  if (!email) return;
  
  try {
    // Import the invitation check service
    const { invitationCheckService } = await import('@/contexts/auth/services/user/invitationCheckService');
    
    // Check for invitations
    const invitations = await invitationCheckService.checkPendingInvitations(email);
    
    // If there are new invitations, show notifications
    if (invitations && invitations.length > 0) {
      const firstInvitation = invitations[0];
      if (firstInvitation.invitation_id) {
        showInvitationNotification(firstInvitation.invitation_id);
      }
    }
  } catch (error) {
    console.error('Failed to check for new invitations:', error);
  }
};
