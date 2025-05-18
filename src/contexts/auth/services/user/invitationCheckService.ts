
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { showInvitationNotification } from '@/utils/notifications';
import { InvitationData } from '@/contexts/auth/services/invitation/types';

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
    
    // Prevent checking too frequently (throttle to once per 30 seconds)
    const now = Date.now();
    if (now - invitationCheckService.lastCheckTime < 30000) {
      console.log('Skipping invitation check - checked too recently');
      return [];
    }
    
    invitationCheckService.lastCheckTime = now;
    
    try {
      console.log(`Checking pending invitations for ${email}`);
      
      // Normalize email to lowercase for consistent comparison
      const normalizedEmail = email.toLowerCase();
      
      // Use simplified query to avoid join issues
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
      const processedInvitations = [];
      let shouldShowNotification = false;
      
      for (const invitation of invitations) {
        // Skip invitations with missing data
        if (!invitation.account_id || !invitation.invitation_id) {
          console.warn(`Invitation has missing required data:`, invitation);
          continue;
        }
        
        try {
          // Fetch account data separately for each invitation
          const { data: accountData, error: accountError } = await supabase
            .from('accounts')
            .select('*')
            .eq('id', invitation.account_id);
            
          if (accountError) {
            console.error('Failed to fetch account data:', accountError);
            continue;
          }
          
          if (!accountData || accountData.length === 0) {
            console.error('No account data returned for id:', invitation.account_id);
            continue;
          }
          
          // Assign accounts property
          const accountInfo = accountData[0];
          invitation.accounts = accountInfo;
          
          // No valid account data or missing owner_id
          if (!accountInfo || !accountInfo.owner_id) {
            console.warn('Invalid account data:', accountInfo);
            continue;
          }
          
          // Fetch owner profile separately
          let ownerName = 'בעל החשבון';
          try {
            const { data: ownerProfile } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', accountInfo.owner_id)
              .maybeSingle();
              
            if (ownerProfile && ownerProfile.name) {
              ownerName = ownerProfile.name;
            }
          } catch (err) {
            console.error('Error fetching owner profile:', err);
            // Continue with default name
          }
          
          // Create owner_profile object for UI display
          const ownerProfile = { name: ownerName };
          
          // Use type assertion to add the owner_profile property
          (invitation as InvitationData).owner_profile = ownerProfile;
          
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
          
          processedInvitations.push(invitation);
        } catch (err) {
          console.error('Error processing invitation:', err);
          continue;
        }
      }

      console.log(`Processed ${processedInvitations.length} pending invitations for ${email}`);
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
      
      // Fetch invitation without joins first
      const { data: invitationData, error: invitationError } = await supabase
        .from('invitations')
        .select('*')
        .eq('invitation_id', invitationId)
        .is('accepted_at', null)
        .gt('expires_at', 'now()');
        
      if (invitationError) {
        console.error("Error checking invitation by ID:", invitationError);
        return false;
      }
      
      // Convert to array and check length
      const invitationArray = Array.isArray(invitationData) ? invitationData : [];
      const exists = invitationArray.length > 0;
      
      console.log(`Invitation ${invitationId} exists in database: ${exists}`);
      
      if (exists && invitationArray[0]) {
        const invitation = invitationArray[0];
        
        // Now fetch account data separately
        try {
          const { data: accountData, error: accountError } = await supabase
            .from('accounts')
            .select('*')
            .eq('id', invitation.account_id);
            
          if (accountError) {
            console.error('Failed to fetch account data in fallback:', accountError);
            return false;
          }
          
          if (!accountData || accountData.length === 0) {
            console.error('No account data found for account_id:', invitation.account_id);
            return false;
          }
          
          // Add accounts property to the invitation 
          invitation.accounts = accountData[0];
          
          // Fetch owner profile separately
          if (accountData[0].owner_id) {
            const { data: ownerData } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', accountData[0].owner_id)
              .maybeSingle();
            
            // Create an owner_profile object
            const owner_profile = ownerData && ownerData.name
              ? { name: ownerData.name } 
              : { name: 'בעל החשבון' };
            
            // Add owner_profile to the data using type assertion
            (invitation as InvitationData).owner_profile = owner_profile;
          } else {
            (invitation as InvitationData).owner_profile = { name: 'בעל החשבון' };
          }
          
          // Store enriched invitation details
          sessionStorage.setItem('currentInvitationDetails', JSON.stringify(invitation));
          return true;
        } catch (err) {
          console.error('Error in account data fallback fetch:', err);
          return false;
        }
      }
      
      return false;
    } catch (error) {
      console.error("Error in checkInvitationById:", error);
      return false;
    }
  }
};
