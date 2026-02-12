
import { supabase } from "@/integrations/supabase/client";
import { cleanupOrphanedInvitations } from './invitationCleaner';

/**
 * Check for pending invitations for a user
 */
export const checkPendingInvitations = async (userEmail: string): Promise<any[]> => {
  try {
    
    // First, cleanup any orphaned invitations
    await cleanupOrphanedInvitations();
    
    const { data: invitations, error } = await supabase
      .from('invitations')
      .select(`
        *,
        accounts:account_id (
          id,
          name,
          owner_id,
          profiles:owner_id (
            name
          )
        )
      `)
      .eq('email', userEmail.toLowerCase())
      .is('accepted_at', null)
      .gt('expires_at', 'now()');
      
    if (error) {
      console.error('checkPendingInvitations: Error fetching invitations:', error);
      return [];
    }
    
    // Filter out invitations where the account doesn't exist (shouldn't happen after cleanup, but just in case)
    const validInvitations = (invitations || []).filter(invitation => invitation.accounts);
    
    // Filtered out invitations with missing accounts if any
    
    return validInvitations;
  } catch (error) {
    console.error('checkPendingInvitations: Error:', error);
    return [];
  }
};
