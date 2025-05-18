
import { supabase } from "@/integrations/supabase/client";
import { InvitationData } from '@/contexts/auth/services/invitation/types';

// Rate limiting to prevent excessive API calls
const CHECK_THROTTLE_MS = 30000; // 30 seconds
let lastCheckTime = 0;

/**
 * Check if an invitation exists by ID and fetch its details
 */
export const checkInvitationById = async (invitationId: string): Promise<boolean> => {
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
};

/**
 * Should we check for invitations now, or is it too soon?
 */
export const shouldCheckInvitations = (): boolean => {
  const now = Date.now();
  const shouldCheck = now - lastCheckTime >= CHECK_THROTTLE_MS;
  
  if (!shouldCheck) {
    console.log('Skipping invitation check - checked too recently');
  }
  
  return shouldCheck;
};

/**
 * Update the last check time to avoid excessive API calls
 */
export const updateLastCheckTime = (): void => {
  lastCheckTime = Date.now();
};
