
import { supabase } from '@/integrations/supabase/client';
import { showInvitationNotification } from './invitationNotifier';
import { toast } from 'sonner';

// Throttling mechanism to prevent excessive API calls
let lastCheckTime: number | null = null;
const CHECK_INTERVAL = 30000; // 30 seconds

/**
 * Automatically checks for new invitations - with throttling to prevent loops
 */
export const checkForNewInvitations = async (email: string) => {
  if (!email) return [];
  
  // Use a static timestamp to prevent multiple checks in short period
  const now = Date.now();
  if (lastCheckTime && now - lastCheckTime < CHECK_INTERVAL) {
    console.log('Skipping invitation check - checked too recently');
    return [];
  }
  
  lastCheckTime = now;
  
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
      
      // Check if we've already notified about these invitations
      const notifiedInvitationsStr = sessionStorage.getItem('notifiedInvitations') || '[]';
      let notifiedIds: string[] = [];
      
      try {
        notifiedIds = JSON.parse(notifiedInvitationsStr);
      } catch (e) {
        console.error('Error parsing notifiedInvitations:', e);
      }
      
      // Show notification for the first invitation we haven't notified about yet
      for (const invitation of invitations) {
        if (invitation.invitation_id && !notifiedIds.includes(invitation.invitation_id)) {
          showInvitationNotification(invitation.invitation_id);
          
          // Add to notified list
          notifiedIds.push(invitation.invitation_id);
          sessionStorage.setItem('notifiedInvitations', JSON.stringify(notifiedIds));
          
          // Only show one notification at a time
          break;
        }
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
