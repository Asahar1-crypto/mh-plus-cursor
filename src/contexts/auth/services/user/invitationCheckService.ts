
import { supabase } from "@/integrations/supabase/client";

/**
 * Service for checking pending invitations for a user
 */
export const invitationCheckService = {
  // Check for pending invitations for a user
  checkPendingInvitations: async (email: string) => {
    try {
      console.log(`Checking pending invitations for ${email}`);
      
      const { data: invitations, error } = await supabase
        .from('invitations')
        .select('*, accounts(*), owner_profile:profiles!accounts(name)')
        .eq('email', email)
        .is('accepted_at', null)
        .gt('expires_at', 'now()');
        
      if (error) {
        console.error("Error checking pending invitations:", error);
        throw error;
      }

      console.log(`Found ${invitations?.length || 0} pending invitations for ${email}`);
      return invitations || [];
    } catch (error) {
      console.error('Failed to check pending invitations:', error);
      return [];
    }
  }
};
