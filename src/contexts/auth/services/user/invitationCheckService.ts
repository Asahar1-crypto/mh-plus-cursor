
import { supabase } from "@/integrations/supabase/client";

// Define interface for the invitation data
interface InvitationData {
  id: string;
  account_id: string;
  email: string;
  invitation_id: string;
  expires_at: string;
  accepted_at: string | null;
  accounts?: {
    name: string;
    id: string;
    owner_id: string;
  };
  owner_profile?: {
    name?: string;
  } | null;
}

/**
 * Service for checking pending invitations for a user
 */
export const invitationCheckService = {
  // Check for pending invitations for a user
  checkPendingInvitations: async (email: string): Promise<InvitationData[]> => {
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
      return invitations as unknown as InvitationData[] || [];
    } catch (error) {
      console.error('Failed to check pending invitations:', error);
      return [];
    }
  }
};
