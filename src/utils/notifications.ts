
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
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          invitation_id,
          email,
          accounts:account_id (
            name,
            owner_id,
            profiles:owner_id (
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
      const ownerName = data.accounts?.profiles?.name || 'בעל החשבון';
      const accountName = data.accounts?.name || 'חשבון משותף';
      
      // Show notification
      toast.info(
        `יש לך הזמנה לחשבון משותף מ-${ownerName}!`,
        {
          description: `הוזמנת להצטרף לחשבון "${accountName}". לצפייה בהזמנה וקבלתה, לחץ על הכפתור למטה`,
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
      console.error('Error checking database invitation:', error);
      checkLocalStorageInvitation();
    }
  };
  
  // Fallback to localStorage if needed
  const checkLocalStorageInvitation = () => {
    try {
      // Check for invitation details in localStorage
      const pendingInvitationsData = localStorage.getItem('pendingInvitations');
      if (!pendingInvitationsData) return;
      
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
      return true;
    }
    
    // Fallback to localStorage
    const pendingInvitationsData = localStorage.getItem('pendingInvitations');
    if (!pendingInvitationsData) return false;
    
    const pendingInvitations = JSON.parse(pendingInvitationsData) as Record<string, PendingInvitationRecord>;
    
    // Check if there are invitations matching the current user's email
    return Object.values(pendingInvitations).some(
      invitation => 
        invitation.sharedWithEmail && 
        invitation.sharedWithEmail.toLowerCase() === currentUserEmail.toLowerCase()
    );
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
    // Check for invitations in Supabase
    const { data: invitations, error } = await supabase
      .from('invitations')
      .select(`
        invitation_id,
        email,
        account_id,
        accounts:account_id (
          name,
          owner_id,
          profiles:owner_id (
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
            ownerName: invitation.accounts.profiles?.name || 'בעל החשבון',
            sharedWithEmail: invitation.email,
            invitationId: invitation.invitation_id,
            accountId: invitation.account_id,
            ownerId: invitation.accounts.owner_id
          };
        }
      });
      
      localStorage.setItem('pendingInvitations', JSON.stringify(pendingInvitations));
      
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
