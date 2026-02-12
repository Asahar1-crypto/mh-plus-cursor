
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { showInvitationNotification } from './invitationNotifier';

/**
 * Checks for new invitations for the current user and shows notifications
 */
export async function checkForNewInvitations(userEmail?: string): Promise<boolean> {
  if (!userEmail) {
    return false;
  }
  
  try {
    
    // Get invitations from database that haven't been accepted yet and haven't expired
    const { data: invitations, error } = await supabase
      .from('invitations')
      .select(`
        *,
        accounts:account_id (
          *,
          profiles:owner_id (
            name
          )
        )
      `)
      .eq('email', userEmail.toLowerCase())
      .is('accepted_at', null)
      .gt('expires_at', 'now()');
      
    if (error) {
      console.error('Error fetching invitations:', error);
      return false;
    }
    
    if (!invitations || invitations.length === 0) {
      return false;
    }
    
    // Check if we've already shown notifications for these invitations
    const notifiedInvitationsStr = sessionStorage.getItem('notifiedInvitations') || '[]';
    let notifiedIds: string[] = [];
    
    try {
      notifiedIds = JSON.parse(notifiedInvitationsStr);
    } catch (e) {
      console.error('Failed to parse notifiedInvitations:', e);
      notifiedIds = [];
    }
    
    // Show notifications for new invitations
    let hasShownNotification = false;
    for (const invitation of invitations) {
      if (invitation.invitation_id && !notifiedIds.includes(invitation.invitation_id)) {
        // Show notification
        showInvitationNotification(invitation.invitation_id);
        hasShownNotification = true;
        
        // Add to notified list
        notifiedIds.push(invitation.invitation_id);
      }
    }
    
    // Update the notified list
    if (hasShownNotification) {
      sessionStorage.setItem('notifiedInvitations', JSON.stringify(notifiedIds));
    }
    
    return invitations.length > 0;
  } catch (error) {
    console.error('Error checking for new invitations:', error);
    return false;
  }
}
