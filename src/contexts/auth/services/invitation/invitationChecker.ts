
import { supabase } from "@/integrations/supabase/client";
import { cleanupOrphanedInvitations } from './invitationCleaner';

/**
 * Check for pending invitations for a user
 */
export const checkPendingInvitations = async (userEmail: string): Promise<any[]> => {
  try {
    console.log(`checkPendingInvitations: Checking for invitations for ${userEmail}`);
    
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
    
    if (validInvitations.length !== (invitations || []).length) {
      console.warn(`checkPendingInvitations: Filtered out ${(invitations || []).length - validInvitations.length} invitations with missing accounts`);
    }
    
    console.log(`checkPendingInvitations: Found ${validInvitations.length} valid pending invitations`);
    
    return validInvitations;
  } catch (error) {
    console.error('checkPendingInvitations: Error:', error);
    return [];
  }
};
