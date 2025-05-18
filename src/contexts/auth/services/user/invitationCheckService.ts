
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
      
      // Simplified and more direct query
      const { data: invitations, error } = await supabase
        .from('invitations')
        .select(`
          *,
          accounts:account_id (*)
        `)
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
      
      // Process invitations to standardize format for UI display
      const processedInvitations = [];
      let shouldShowNotification = false;
      
      for (const invitation of invitations) {
        // Skip invitations with missing data
        if (!invitation.account_id || !invitation.invitation_id) {
          console.warn(`Invitation has missing required data:`, invitation);
          continue;
        }
        
        // Fetch account and owner data if missing
        if (!invitation.accounts || !invitation.accounts.id) {
          console.error('Invitation has missing critical account data:', invitation);
          
          try {
            // Fetch account data directly
            const { data: accountData, error: accountError } = await supabase
              .from('accounts')
              .select('*')
              .eq('id', invitation.account_id)
              .single();
              
            if (accountError || !accountData) {
              console.error('Failed to fetch account data:', accountError);
              continue;
            }
            
            invitation.accounts = accountData;
          } catch (err) {
            console.error('Error fetching additional account data:', err);
            continue;
          }
        }
        
        // If still no valid account data, skip this invitation
        if (!invitation.accounts || !invitation.accounts.id || !invitation.accounts.owner_id) {
          console.warn('Invitation still has invalid account data after retry:', invitation);
          continue;
        }
        
        // Fetch owner profile separately for reliability
        let ownerName = 'בעל החשבון';
        try {
          if (invitation.accounts.owner_id) {
            const { data: ownerProfile } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', invitation.accounts.owner_id)
              .maybeSingle();
              
            if (ownerProfile?.name) {
              ownerName = ownerProfile.name;
            }
          }
        } catch (err) {
          console.error('Error fetching owner profile:', err);
          // Continue with default name
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
        
        // Add processed invitation to list
        processedInvitations.push({
          ...invitation,
          owner_profile: { name: ownerName }
        });
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
      
      // Simplified query structure
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          *,
          accounts:account_id (*)
        `)
        .eq('invitation_id', invitationId)
        .is('accepted_at', null)
        .gt('expires_at', 'now()')
        .maybeSingle();
        
      if (error) {
        console.error("Error checking invitation by ID:", error);
        return false;
      }
      
      const exists = !!data;
      console.log(`Invitation ${invitationId} exists in database: ${exists}`);
      
      if (exists && data) {
        // Extra validation to ensure account data is valid
        if (!data.accounts || !data.accounts.id) {
          console.error("Invitation found but account data is missing or invalid:", data);
          
          // Try to fetch the account data separately
          try {
            const { data: accountData, error: accountError } = await supabase
              .from('accounts')
              .select('*')
              .eq('id', data.account_id)
              .single();
              
            if (accountError || !accountData) {
              console.error('Failed to fetch account data in fallback:', accountError || 'Missing account data');
              return false;
            }
            
            // Merge the fetched account data with the invitation data
            data.accounts = accountData;
            
            // Fetch owner profile separately
            if (accountData.owner_id) {
              const { data: ownerProfile } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', accountData.owner_id)
                .maybeSingle();
                
              if (ownerProfile) {
                // Add owner profile to account data
                data.accounts.profiles = ownerProfile;
              }
            }
            
            // Store the enriched invitation details in sessionStorage
            sessionStorage.setItem('currentInvitationDetails', JSON.stringify(data));
            return true;
          } catch (err) {
            console.error('Error in account data fallback fetch:', err);
            return false;
          }
        }
        
        // Temporarily store invitation details in sessionStorage for UI
        sessionStorage.setItem('currentInvitationDetails', JSON.stringify(data));
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error("Error in checkInvitationById:", error);
      return false;
    }
  }
};
