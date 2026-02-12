
import { supabase } from "@/integrations/supabase/client";

/**
 * Clean up invalid invitations - those that reference non-existent accounts
 */
export const cleanupInvalidInvitation = async (invitationId: string): Promise<void> => {
  try {
    await supabase
      .from('invitations')
      .delete()
      .eq('invitation_id', invitationId);
  } catch (error) {
    console.error('cleanupInvalidInvitation: Error cleaning up invalid invitation:', error);
  }
};

/**
 * Clean up all orphaned invitations that reference non-existent accounts
 */
export const cleanupOrphanedInvitations = async (): Promise<void> => {
  try {
    // Get all pending invitations
    const { data: invitations, error: invitationsError } = await supabase
      .from('invitations')
      .select('invitation_id, account_id, email')
      .is('accepted_at', null);
      
    if (invitationsError) {
      console.error('cleanupOrphanedInvitations: Error fetching invitations:', invitationsError);
      return;
    }
    
    if (!invitations || invitations.length === 0) {
      return;
    }
    
    // Check each invitation's account
    const orphanedInvitations = [];
    
    for (const invitation of invitations) {
      const { data: accountExists } = await supabase
        .from('accounts')
        .select('id')
        .eq('id', invitation.account_id)
        .single();
        
      if (!accountExists) {
        orphanedInvitations.push(invitation.invitation_id);
      }
    }
    
    // Remove orphaned invitations
    if (orphanedInvitations.length > 0) {
      const { error: deleteError } = await supabase
        .from('invitations')
        .delete()
        .in('invitation_id', orphanedInvitations);
        
      if (deleteError) {
        console.error('cleanupOrphanedInvitations: Error deleting orphaned invitations:', deleteError);
      }
    }
    
  } catch (error) {
    console.error('cleanupOrphanedInvitations: Error during cleanup:', error);
  }
};
