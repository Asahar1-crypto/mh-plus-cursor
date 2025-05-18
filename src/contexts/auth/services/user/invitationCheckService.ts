
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
      
      // Get basic invitation data with full account and owner information
      // Using a more robust query to ensure we get all the data we need
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
            profiles!accounts_owner_id_fkey (
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
        
        // Enhanced validation for account data
        if (!invitation.accounts.id || !invitation.accounts.owner_id) {
          console.error('Invitation has missing critical account data:', invitation);
          
          // Try to fetch more complete account data directly
          try {
            const { data: accountData, error: accountError } = await supabase
              .from('accounts')
              .select('*, profiles!accounts_owner_id_fkey(id, name)')
              .eq('id', invitation.account_id)
              .single();
              
            if (accountError || !accountData) {
              console.error('Failed to fetch account data:', accountError);
              continue;
            }
            
            // Replace the incomplete account data with the complete data
            invitation.accounts = accountData;
          } catch (err) {
            console.error('Error fetching additional account data:', err);
            continue;
          }
        }
        
        // Double-check we now have valid account data
        const hasValidAccountData = invitation.accounts && 
                                   invitation.accounts.id && 
                                   invitation.accounts.owner_id;
                                   
        if (!hasValidAccountData) {
          console.warn('Invitation still has invalid account data after retry:', invitation);
          continue;
        }
        
        // Extract owner name from profiles
        let ownerName = 'בעל החשבון';
        
        // Handle different profile data structures
        if (invitation.accounts.profiles) {
          if (Array.isArray(invitation.accounts.profiles)) {
            if (invitation.accounts.profiles.length > 0) {
              ownerName = invitation.accounts.profiles[0]?.name || 'בעל החשבון';
            }
          } else if (typeof invitation.accounts.profiles === 'object' && invitation.accounts.profiles) {
            ownerName = invitation.accounts.profiles.name || 'בעל החשבון';
          }
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
      
      // Using a more complete query to ensure we have all necessary data
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          invitation_id,
          account_id,
          email,
          expires_at,
          accepted_at,
          accounts!inner (
            id,
            name,
            owner_id,
            profiles!accounts_owner_id_fkey (
              id,
              name
            )
          )
        `)
        .eq('invitation_id', invitationId)
        .is('accepted_at', null) // Must not be accepted
        .gt('expires_at', 'now()') // Must not be expired
        .maybeSingle(); // Use maybeSingle to avoid errors
        
      if (error) {
        console.error("Error checking invitation by ID:", error);
        return false;
      }
      
      const exists = !!data;
      console.log(`Invitation ${invitationId} exists in database: ${exists}`);
      
      if (exists && data) {
        // Extra validation to ensure account data is valid and complete
        const hasValidAccountData = data.accounts && 
                                    data.accounts.id && 
                                    data.accounts.owner_id;
                                    
        if (!hasValidAccountData) {
          console.error("Invitation found but account data is missing or invalid:", data);
          
          // Try to fetch the account data separately as a fallback
          try {
            const { data: accountData, error: accountError } = await supabase
              .from('accounts')
              .select('*, profiles!accounts_owner_id_fkey(id, name)')
              .eq('id', data.account_id)
              .single();
              
            if (accountError || !accountData || !accountData.id || !accountData.owner_id) {
              console.error('Failed to fetch account data in fallback:', accountError || 'Missing account data');
              return false;
            }
            
            // Merge the fetched account data with the invitation data
            data.accounts = accountData;
            
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
