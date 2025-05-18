
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { showInvitationNotification } from '@/utils/notifications';

/**
 * Service for checking pending invitations for a user
 */
export const invitationCheckService = {
  // Track when we last checked for invitations to prevent excessive checking
  lastCheckTime: 0,
  
  // Check for pending invitations for a user
  checkPendingInvitations: async (email: string): Promise<any[]> => {
    if (!email) {
      console.log('No email provided for invitation check');
      return [];
    }
    
    // Prevent checking too frequently (throttle to once per 10 seconds)
    const now = Date.now();
    if (now - invitationCheckService.lastCheckTime < 10000) {
      console.log('Skipping invitation check - checked too recently');
      return [];
    }
    
    invitationCheckService.lastCheckTime = now;
    
    try {
      console.log(`Checking pending invitations for ${email}`);
      
      // Normalize email to lowercase for consistent comparison
      const normalizedEmail = email.toLowerCase();
      
      // Get basic invitation data with full account and owner information
      // Adding specific conditions to ensure we get only valid invitations
      const { data: invitations, error } = await supabase
        .from('invitations')
        .select(`
          id,
          account_id,
          email,
          invitation_id,
          expires_at,
          accepted_at,
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
        .eq('email', normalizedEmail)
        .is('accepted_at', null) // Explicitly check that it's not accepted
        .gt('expires_at', 'now()'); // Explicitly check that it's not expired
        
      if (error) {
        console.error("Error checking pending invitations:", error);
        return [];
      }

      if (!invitations || invitations.length === 0) {
        console.log(`No pending invitations found for ${email}`);
        return [];
      }

      console.log(`Found ${invitations.length} pending invitations for ${email}:`, invitations);
      
      // Process invitations to standardize format for UI display
      const processedInvitations = [];
      let shouldShowNotification = false;
      
      for (const invitation of invitations) {
        // Validate that the invitation has all required data
        if (!invitation.accounts || !invitation.account_id || !invitation.invitation_id) {
          console.warn(`Invitation has missing required data:`, invitation);
          continue;
        }
        
        // Owner information is included directly in the query via the nested select
        const ownerName = invitation.accounts.profiles?.[0]?.name || 'בעל החשבון';
        
        // Check if we've already notified about this invitation using sessionStorage
        // (minimizing notifications but not storing permanent state in localStorage)
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
        
        if (!notifiedIds.includes(invitation.invitation_id)) {
          shouldShowNotification = true;
          // Mark as notified
          notifiedIds.push(invitation.invitation_id);
          sessionStorage.setItem('notifiedInvitations', JSON.stringify(notifiedIds));
        }
        
        // Add processed invitation to list
        processedInvitations.push({
          ...invitation,
          owner_profile: { name: ownerName }
        });
      }

      console.log(`Processed ${processedInvitations.length} pending invitations for ${email}`);
      
      // Show notification for first invitation if we haven't shown it before
      if (shouldShowNotification && processedInvitations.length > 0 && processedInvitations[0].invitation_id) {
        // Don't show notification if we're already on the invitation page
        const currentPath = window.location.pathname;
        const isOnInvitationPage = currentPath.includes('/invitation/');
        
        if (!isOnInvitationPage) {
          // Temporarily store active invitation ID in sessionStorage (not localStorage)
          // This is just for UI purposes, not for permanent storage
          sessionStorage.setItem('currentActiveInvitationId', processedInvitations[0].invitation_id);
          
          // Show notification with valid invitation_id
          showInvitationNotification(processedInvitations[0].invitation_id);
        }
      }
      
      return processedInvitations;
    } catch (error) {
      console.error('Failed to check pending invitations:', error);
      return [];
    }
  },
  
  // Debug helper - directly check if an invitation exists by ID
  checkInvitationById: async (invitationId: string): Promise<boolean> => {
    if (!invitationId) return false;
    
    try {
      console.log(`Checking if invitation exists with ID: ${invitationId}`);
      
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          invitation_id,
          account_id,
          email,
          expires_at,
          accepted_at,
          accounts:account_id (
            id,
            name,
            owner_id
          )
        `)
        .eq('invitation_id', invitationId)
        .is('accepted_at', null) // Must not be accepted
        .gt('expires_at', 'now()'); // Must not be expired
        
      if (error) {
        console.error("Error checking invitation by ID:", error);
        return false;
      }
      
      const exists = data && data.length > 0;
      console.log(`Invitation ${invitationId} exists in database: ${exists}`);
      
      if (exists && data[0]) {
        // Temporarily store invitation details in sessionStorage for UI
        sessionStorage.setItem('currentInvitationDetails', JSON.stringify(data[0]));
      }
      
      return exists;
      
    } catch (error) {
      console.error("Error in checkInvitationById:", error);
      return false;
    }
  }
};
