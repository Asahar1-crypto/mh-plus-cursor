
import { supabase } from "@/integrations/supabase/client";
import { fetchAccountData, enhanceInvitation } from "./invitationFetcher";

// Rate limiting to prevent excessive API calls
const CHECK_THROTTLE_MS = 30000; // 30 seconds
let lastCheckTime = 0;

/**
 * Check if an invitation exists by ID and fetch its details
 */
export const checkInvitationById = async (invitationId: string): Promise<boolean> => {
  if (!invitationId) return false;
  
  try {
    
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
    
    if (exists && invitationArray[0]) {
      const invitation = invitationArray[0];
      
      // Get enhanced invitation with account data
      const enhancedInvitation = await enhanceInvitation(invitation);
      
      if (!enhancedInvitation) {
        return false;
      }
      
      // Store enriched invitation details
      sessionStorage.setItem('currentInvitationDetails', JSON.stringify(enhancedInvitation));
      return true;
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
  
  // Throttled - skip if checked too recently
  
  return shouldCheck;
};

/**
 * Update the last check time to avoid excessive API calls
 */
export const updateLastCheckTime = (): void => {
  lastCheckTime = Date.now();
};
