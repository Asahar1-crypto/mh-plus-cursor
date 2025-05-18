
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
      const processedInvitations = [];
      let shouldShowNotification = false;
      
      for (const invitation of invitations) {
        // Skip invitations with missing data
        if (!invitation.account_id || !invitation.invitation_id) {
          console.warn(`Invitation has missing required data:`, invitation);
          continue;
        }
        
        try {
          // IMPORTANT: First verify that account actually exists
          const { data: accountExists, error: accountCheckError } = await supabase
            .from('accounts')
            .select('id')
            .eq('id', invitation.account_id)
            .single();
            
          if (accountCheckError || !accountExists) {
            console.warn(`No account found for ID ${invitation.account_id}, skipping invitation`);
            
            // Optionally clean up invalid invitation
            await supabase
              .from('invitations')
              .delete()
              .eq('invitation_id', invitation.invitation_id);
              
            continue;
          }
          
          // Fetch account data separately for each invitation
          const { data: accountData, error: accountError } = await supabase
            .from('accounts')
            .select('*')
            .eq('id', invitation.account_id)
            .single();
            
          if (accountError || !accountData) {
            console.error('Failed to fetch account data:', accountError);
            continue;
          }
          
          // Create enhanced invitation with account data
          const enhancedInvitation = {
            ...invitation,
            accounts: accountData
          } as InvitationData;
          
          // No valid account data or missing owner_id
          if (!accountData.owner_id) {
            console.warn('Invalid account data - missing owner_id:', accountData);
            continue;
          }
          
          // Fetch owner profile separately
          let ownerName = 'בעל החשבון';
          try {
            const { data: ownerProfile } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', accountData.owner_id)
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
          
          // Add the owner_profile property
          enhancedInvitation.owner_profile = ownerProfile;
          
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
        
      if (invitationError || !invitationData || invitationData.length === 0) {
        console.error("Error checking invitation by ID or invitation not found:", invitationError);
        return false;
      }
      
      // Convert to array and check length
      const invitationArray = Array.isArray(invitationData) ? invitationData : [];
      const exists = invitationArray.length > 0;
      
      console.log(`Invitation ${invitationId} exists in database: ${exists}`);
      
      if (exists && invitationArray[0]) {
        const invitation = invitationArray[0];
        
        // IMPORTANT: First verify that account actually exists
        const { data: accountExists, error: accountCheckError } = await supabase
          .from('accounts')
          .select('id')
          .eq('id', invitation.account_id)
          .single();
          
        if (accountCheckError || !accountExists) {
          console.warn(`No account found for ID ${invitation.account_id}, invalid invitation`);
          return false;
        }
        
        // Now fetch account data separately
        try {
          const { data: accountData, error: accountError } = await supabase
            .from('accounts')
            .select('*')
            .eq('id', invitation.account_id)
            .single();
            
          if (accountError || !accountData) {
            console.error('No account data found for account_id:', invitation.account_id);
            return false;
          }

          // Create enhanced invitation with account data
          const enhancedInvitation = {
            ...invitation,
            accounts: accountData
          } as InvitationData;
          
          // Fetch owner profile separately
          let ownerName = 'בעל החשבון';
          
          if (accountData.owner_id) {
            try {
              const { data: ownerData } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', accountData.owner_id)
                .maybeSingle();
                
              if (ownerData && ownerData.name) {
                ownerName = ownerData.name;
              }
            } catch (err) {
              console.error('Error fetching owner profile:', err);
              // Continue with default name
            }
          } else {
            console.log("Warning: Account has no owner_id:", accountData);
            return false; // Invalid account without owner_id
          }
          
          // Create an owner_profile object
          enhancedInvitation.owner_profile = { name: ownerName };
          
          // Store enriched invitation details
          sessionStorage.setItem('currentInvitationDetails', JSON.stringify(enhancedInvitation));
          return true;
        } catch (err) {
          console.error('Error in account data fetch:', err);
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
