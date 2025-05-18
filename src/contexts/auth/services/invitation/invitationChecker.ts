
import { supabase } from '@/integrations/supabase/client';
import { InvitationData } from './types';
import { toast } from 'sonner';
import { showInvitationNotification } from '@/utils/notifications';

/**
 * Checks for pending invitations for the current user
 */
export async function checkPendingInvitations(userEmail: string): Promise<InvitationData[]> {
  if (!userEmail) {
    console.log('No user email provided, skipping invitation check');
    return [];
  }
  
  console.log(`Checking pending invitations for user with email: ${userEmail}`);
  
  try {
    // Check for invitations in database
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
      console.error('Error fetching pending invitations:', error);
      return [];
    }
    
    if (!invitations || invitations.length === 0) {
      console.log('No pending invitations found');
      return [];
    }
    
    console.log(`Found ${invitations.length} pending invitations:`, invitations);
    
    // Show notification for the first invitation
    if (invitations.length > 0 && invitations[0].invitation_id) {
      // Check if we've already notified about this invitation
      const notifiedInvitationsStr = sessionStorage.getItem('notifiedInvitations') || '[]';
      let notifiedIds: string[] = [];
      
      try {
        notifiedIds = JSON.parse(notifiedInvitationsStr);
      } catch (e) {
        console.error('Failed to parse notifiedInvitations:', e);
      }
      
      const firstInvitation = invitations[0];
      if (firstInvitation.invitation_id && !notifiedIds.includes(firstInvitation.invitation_id)) {
        // Show notification
        showInvitationNotification(firstInvitation.invitation_id);
        
        // Add to notified list
        notifiedIds.push(firstInvitation.invitation_id);
        sessionStorage.setItem('notifiedInvitations', JSON.stringify(notifiedIds));
      }
    }
    
    return invitations as InvitationData[];
  } catch (error) {
    console.error('Error in checkPendingInvitations:', error);
    return [];
  }
}
