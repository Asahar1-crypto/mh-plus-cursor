
import { supabase } from "@/integrations/supabase/client";

/**
 * Clean up invalid invitations - those that reference non-existent accounts
 */
export const cleanupInvalidInvitation = async (invitationId: string): Promise<void> => {
  try {
    console.log(`cleanupInvalidInvitation: Removing invitation ${invitationId}`);
    await supabase
      .from('invitations')
      .delete()
      .eq('invitation_id', invitationId);
    console.log(`cleanupInvalidInvitation: Successfully removed invitation ${invitationId}`);
  } catch (error) {
    console.error('cleanupInvalidInvitation: Error cleaning up invalid invitation:', error);
  }
};

/**
 * Clean up all orphaned invitations that reference non-existent accounts
 */
export const cleanupOrphanedInvitations = async (): Promise<void> => {
  try {
    console.log('cleanupOrphanedInvitations: Starting cleanup of orphaned invitations');
    
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
      console.log('cleanupOrphanedInvitations: No pending invitations found');
      return;
    }
    
    console.log(`cleanupOrphanedInvitations: Found ${invitations.length} pending invitations to check`);
    
    // Check each invitation's account
    const orphanedInvitations = [];
    
    for (const invitation of invitations) {
      const { data: accountExists } = await supabase
        .from('accounts')
        .select('id')
        .eq('id', invitation.account_id)
        .single();
        
      if (!accountExists) {
        console.log(`cleanupOrphanedInvitations: Found orphaned invitation ${invitation.invitation_id} for non-existent account ${invitation.account_id}`);
        orphanedInvitations.push(invitation.invitation_id);
      }
    }
    
    // Remove orphaned invitations
    if (orphanedInvitations.length > 0) {
      console.log(`cleanupOrphanedInvitations: Removing ${orphanedInvitations.length} orphaned invitations`);
      
      const { error: deleteError } = await supabase
        .from('invitations')
        .delete()
        .in('invitation_id', orphanedInvitations);
        
      if (deleteError) {
        console.error('cleanupOrphanedInvitations: Error deleting orphaned invitations:', deleteError);
      } else {
        console.log('cleanupOrphanedInvitations: Successfully removed orphaned invitations');
      }
    } else {
      console.log('cleanupOrphanedInvitations: No orphaned invitations found');
    }
    
  } catch (error) {
    console.error('cleanupOrphanedInvitations: Error during cleanup:', error);
  }
};
