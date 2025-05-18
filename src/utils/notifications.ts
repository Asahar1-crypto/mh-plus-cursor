
import { toast } from 'sonner';
import { PendingInvitationRecord } from '@/contexts/auth/services/invitation/types';
import { supabase } from '@/integrations/supabase/client';

/**
 * Shows notification for a new invitation
 */
export const showInvitationNotification = (invitationId: string) => {
  // Get invitation details from Supabase
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
        console.error("Could not find invitation in database:", error);
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
    }
  };
  
  // Start checking with database
  checkDatabaseInvitation();
};

/**
 * Checks if there are pending invitations for the current user
 */
export const hasPendingInvitations = async (currentUserEmail?: string): Promise<boolean> => {
  if (!currentUserEmail) return false;
  
  try {
    // Check database for invitations
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
    
    return false;
  } catch (error) {
    console.error('Failed to check pending invitations:', error);
    return false;
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
 * Debug helper - Dumps invitation info from sessionStorage to console
 */
export const debugInvitations = (): void => {
  try {
    console.log("--- DEBUG INVITATIONS ---");
    
    // Check sessionStorage for temporary invitation data
    console.log("currentActiveInvitationId:", sessionStorage.getItem('currentActiveInvitationId'));
    console.log("pendingInvitationId:", sessionStorage.getItem('pendingInvitationId'));
    console.log("pendingInvitationAccountId:", sessionStorage.getItem('pendingInvitationAccountId'));
    console.log("pendingInvitationOwnerId:", sessionStorage.getItem('pendingInvitationOwnerId'));
    
    // Check if there are any details in sessionStorage
    const currentInvDetails = sessionStorage.getItem('currentInvitationDetails');
    if (currentInvDetails) {
      try {
        console.log("currentInvitationDetails:", JSON.parse(currentInvDetails));
      } catch (e) {
        console.log("Failed to parse currentInvitationDetails");
      }
    }
    
    console.log("------------------------");
  } catch (error) {
    console.error("Error in debugInvitations:", error);
  }
};

/**
 * Clear temporary invitation data from sessionStorage
 */
export const clearAllPendingInvitations = (): void => {
  try {
    // Clear session storage items
    sessionStorage.removeItem('notifiedInvitations');
    sessionStorage.removeItem('currentActiveInvitationId');
    sessionStorage.removeItem('pendingInvitationId');
    sessionStorage.removeItem('pendingInvitationAccountId');
    sessionStorage.removeItem('pendingInvitationOwnerId');
    sessionStorage.removeItem('currentInvitationDetails');
    sessionStorage.removeItem('pendingInvitationsAfterRegistration');
    
    console.log('All temporary invitation data cleared from sessionStorage');
    toast.success('רשימת ההזמנות נוקתה בהצלחה');
  } catch (error) {
    console.error('Failed to clear pending invitations:', error);
    toast.error('אירעה שגיאה בניקוי רשימת ההזמנות');
  }
};
