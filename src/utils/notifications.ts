
import { toast } from 'sonner';
import { PendingInvitationRecord } from '@/contexts/auth/services/invitation/types';
import { supabase } from '@/integrations/supabase/client';

/**
 * Shows notification for a new invitation
 */
export const showInvitationNotification = (invitationId: string) => {
  // First try to get invitation details from Supabase
  const checkDatabaseInvitation = async () => {
    try {
      console.log(`Showing notification for invitation ID: ${invitationId}`);
      
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          invitation_id,
          email,
          accounts:account_id (
            id,
            name,
            owner_id,
            profiles!owner_id (
              id,
              name
            )
          )
        `)
        .eq('invitation_id', invitationId)
        .is('accepted_at', null)
        .gt('expires_at', 'now()')
        .single();

      if (error || !data) {
        console.error("Could not find invitation in database, falling back to localStorage:", error);
        checkLocalStorageInvitation();
        return;
      }

      // Found invitation in database
      const ownerName = data.accounts?.profiles?.[0]?.name || 'בעל החשבון';
      const accountName = data.accounts?.name || 'חשבון משותף';
      
      // Show notification
      toast.info(
        `יש לך הזמנה לחשבון משותף מ-${ownerName}!`,
        {
          description: `הוזמנת להצטרף לחשבון "${accountName}". לצפייה בהזמנה וקבלתה, לחץ על הכפתור למטה`,
          duration: 30000, // Longer duration for better visibility
          action: {
            label: "צפה בהזמנה",
            onClick: () => {
              window.location.href = `/invitation/${invitationId}`;
            }
          }
        }
      );
    } catch (error) {
      console.error('Error checking database invitation:', error);
      checkLocalStorageInvitation();
    }
  };
  
  // Fallback to localStorage if needed
  const checkLocalStorageInvitation = () => {
    try {
      // Check for invitation details in localStorage
      const pendingInvitationsData = localStorage.getItem('pendingInvitations');
      if (!pendingInvitationsData) {
        console.error("No pending invitations in localStorage");
        return;
      }
      
      const pendingInvitations = JSON.parse(pendingInvitationsData) as Record<string, PendingInvitationRecord>;
      const invitation = pendingInvitations[invitationId];
      
      if (!invitation) {
        console.error(`Invitation ${invitationId} not found in localStorage`);
        return;
      }
      
      console.log("Found invitation in localStorage:", invitation);
      
      // Show notification with invitation details
      toast.info(
        `יש לך הזמנה לחשבון משותף מ-${invitation.ownerName || 'בעל החשבון'}!`,
        {
          description: `הוזמנת להצטרף לחשבון "${invitation.name || 'חשבון משותף'}". לצפייה בהזמנה וקבלתה, לחץ על הכפתור למטה`,
          duration: 30000, // Longer duration for better visibility
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
  
  // Start checking with database first
  checkDatabaseInvitation();
};

/**
 * Checks if there are pending invitations for the current user
 */
export const hasPendingInvitations = async (currentUserEmail?: string): Promise<boolean> => {
  if (!currentUserEmail) return false;
  
  try {
    // First check database for invitations
    const { data, error } = await supabase
      .from('invitations')
      .select('invitation_id, email')
      .eq('email', currentUserEmail.toLowerCase())
      .is('accepted_at', null)
      .gt('expires_at', 'now()');
    
    if (!error && data && data.length > 0) {
      console.log(`Found ${data.length} pending invitations in database for ${currentUserEmail}`);
      return true;
    }
    
    // Fallback to localStorage
    const pendingInvitationsData = localStorage.getItem('pendingInvitations');
    if (!pendingInvitationsData) return false;
    
    try {
      const pendingInvitations = JSON.parse(pendingInvitationsData) as Record<string, PendingInvitationRecord>;
      
      // Check if there are invitations matching the current user's email
      const hasLocalInvitations = Object.values(pendingInvitations).some(
        invitation => 
          invitation.sharedWithEmail && 
          invitation.sharedWithEmail.toLowerCase() === currentUserEmail.toLowerCase()
      );
      
      if (hasLocalInvitations) {
        console.log(`Found pending invitations in localStorage for ${currentUserEmail}`);
      }
      
      return hasLocalInvitations;
    } catch (e) {
      console.error("Error parsing localStorage invitations:", e);
      return false;
    }
  } catch (error) {
    console.error('Failed to check pending invitations:', error);
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
    localStorage.removeItem('notifiedInvitations');
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
  if (!email) return [];
  
  try {
    console.log(`Checking for new invitations for ${email}`);
    
    // Check for invitations in Supabase
    const { data: invitations, error } = await supabase
      .from('invitations')
      .select(`
        invitation_id,
        email,
        account_id,
        accounts:account_id (
          id,
          name,
          owner_id,
          profiles!owner_id (
            id,
            name
          )
        )
      `)
      .eq('email', email.toLowerCase())
      .is('accepted_at', null)
      .gt('expires_at', 'now()');
      
    if (error) {
      console.error('Error fetching invitations from Supabase:', error);
      return [];
    }
    
    // If there are new invitations, show notifications
    if (invitations && invitations.length > 0) {
      console.log("Found invitations in database:", invitations);
      
      // Add to localStorage for backup
      const pendingInvitations: Record<string, PendingInvitationRecord> = {};
      const localInvitationsData = localStorage.getItem('pendingInvitations');
      
      if (localInvitationsData) {
        try {
          Object.assign(pendingInvitations, JSON.parse(localInvitationsData));
        } catch (e) {
          console.error('Error parsing localStorage invitations:', e);
        }
      }
      
      // Add or update invitations in localStorage
      invitations.forEach(invitation => {
        if (invitation.invitation_id && invitation.accounts) {
          pendingInvitations[invitation.invitation_id] = {
            name: invitation.accounts.name || 'חשבון משותף',
            ownerName: invitation.accounts.profiles?.[0]?.name || 'בעל החשבון',
            sharedWithEmail: invitation.email,
            invitationId: invitation.invitation_id,
            accountId: invitation.account_id,
            ownerId: invitation.accounts.owner_id
          };
        }
      });
      
      localStorage.setItem('pendingInvitations', JSON.stringify(pendingInvitations));
      console.log("Updated localStorage with invitations:", pendingInvitations);
      
      // Show notification for the first invitation
      if (invitations[0]?.invitation_id) {
        showInvitationNotification(invitations[0].invitation_id);
      }
      
      return invitations;
    }
    
    return [];
  } catch (error) {
    console.error('Failed to check for new invitations:', error);
    return [];
  }
};

/**
 * Debug helper - Dumps all stored invitations to console
 */
export const debugInvitations = (): void => {
  try {
    console.log("--- DEBUG INVITATIONS ---");
    
    // Check localStorage
    const pendingInvitations = localStorage.getItem('pendingInvitations');
    console.log("pendingInvitations:", pendingInvitations ? JSON.parse(pendingInvitations) : null);
    
    const notifiedInvitations = localStorage.getItem('notifiedInvitations');
    console.log("notifiedInvitations:", notifiedInvitations ? JSON.parse(notifiedInvitations) : null);
    
    // Check sessionStorage
    console.log("pendingInvitationId:", sessionStorage.getItem('pendingInvitationId'));
    console.log("pendingInvitationAccountId:", sessionStorage.getItem('pendingInvitationAccountId'));
    
    console.log("------------------------");
  } catch (error) {
    console.error("Error in debugInvitations:", error);
  }
};
