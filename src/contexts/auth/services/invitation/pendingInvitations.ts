
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { showInvitationNotification } from '@/utils/notifications';
import { InvitationData } from './types';
import { 
  shouldCheckInvitations, 
  updateLastCheckTime 
} from './checkInvitation';
import { 
  enhanceInvitation, 
  cleanupInvalidInvitation 
} from './fetchInvitation';

/**
 * Check for pending invitations for a user's email
 */
export const checkPendingInvitations = async (email: string): Promise<InvitationData[]> => {
  if (!email) {
    console.log('No email provided for invitation check');
    return [];
  }
  
  // Prevent checking too frequently (throttle to once per 30 seconds)
  if (!shouldCheckInvitations()) {
    return [];
  }
  
  updateLastCheckTime();
  
  try {
    console.log(`Checking pending invitations for ${email}`);
    
    // Normalize email to lowercase for consistent comparison
    const normalizedEmail = email.toLowerCase();
    
    // First, get valid invitations
    const { data: invitations, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('email', normalizedEmail)
      .is('accepted_at', null) 
      .gt('expires_at', 'now()');
      
    if (error) {
      console.error("Error checking pending invitations:", error);
      return [];
    }

    if (!invitations || invitations.length === 0) {
      console.log(`No pending invitations found for ${email}`);
      return [];
    }

    console.log(`Found ${invitations.length} pending invitations for ${email}:`, invitations);
    
    // Process invitations one by one to ensure we have all required data
    const processedInvitations: InvitationData[] = [];
    let shouldShowNotification = false;
    
    for (const invitation of invitations) {
      // Get enhanced invitation with account and owner data
      const enhancedInvitation = await enhanceInvitation(invitation);
      
      if (!enhancedInvitation) {
        // Clean up invalid invitations that have no associated account
        if (invitation.invitation_id) {
          await cleanupInvalidInvitation(invitation.invitation_id);
        }
        continue;
      }
      
      // Check if we've already notified about this invitation
      const notifiedInvitationsStr = sessionStorage.getItem('notifiedInvitations') || '[]';
      let notifiedIds: string[];
      
      try {
        notifiedIds = JSON.parse(notifiedInvitationsStr);
        if (!Array.isArray(notifiedIds)) {
          notifiedIds = [];
        }
      } catch (e) {
        console.error('Error parsing notifiedInvitations:', e);
        notifiedIds = [];
      }
      
      // Only show notification once per invitation
      if (!notifiedIds.includes(invitation.invitation_id)) {
        shouldShowNotification = true;
        // Mark as notified
        notifiedIds.push(invitation.invitation_id);
        sessionStorage.setItem('notifiedInvitations', JSON.stringify(notifiedIds));
        
        // Don't show notification if we're already on the invitation page
        const currentPath = window.location.pathname;
        const isOnInvitationPage = currentPath.includes('/invitation/');
        
        if (!isOnInvitationPage) {
          // Show at most one notification per check
          showInvitationNotification(invitation.invitation_id);
          break;
        }
      }
      
      processedInvitations.push(enhancedInvitation);
    }

    console.log(`Processed ${processedInvitations.length} pending invitations for ${email}`);
    return processedInvitations;
  } catch (error) {
    console.error('Failed to check pending invitations:', error);
    return [];
  }
};
