
import { supabase } from "@/integrations/supabase/client";
import { Account } from '../../types';
import { toast } from 'sonner';
import { PendingInvitationRecord } from './types';

/**
 * Removes an invitation and updates the account
 */
export async function removeInvitation(account: Account): Promise<Account> {
  try {
    console.log("Removing invitation from account:", account);
    
    if (!account) {
      throw new Error("Cannot remove invitation: No account provided");
    }
    
    // In a real implementation with Supabase, we'd mark the invitation as deleted or remove it
    if (account.invitationId) {
      console.log(`Removing invitation with ID: ${account.invitationId}`);
      
      // Remove the invitation from Supabase
      const { error: invitationError } = await supabase
        .from('invitations')
        .delete() // Changed from update to delete for proper removal
        .eq('invitation_id', account.invitationId);
        
      if (invitationError) {
        console.error("Error deleting invitation:", invitationError);
        throw invitationError;
      }
      
      console.log("Successfully deleted invitation from database");
      
      // Remove from localStorage for the demo
      try {
        const pendingInvitationsData = localStorage.getItem('pendingInvitations');
        if (pendingInvitationsData) {
          const pendingInvitations = JSON.parse(pendingInvitationsData) as Record<string, PendingInvitationRecord>;
          if (pendingInvitations[account.invitationId]) {
            delete pendingInvitations[account.invitationId];
            localStorage.setItem('pendingInvitations', JSON.stringify(pendingInvitations));
            console.log("Removed invitation from localStorage");
          }
        }
      } catch (storageError) {
        console.error("Error updating localStorage:", storageError);
        // Continue execution even if localStorage operation fails
      }
    } else {
      console.log("No invitation ID found in the account, skipping invitation deletion");
    }
    
    // Update the account in Supabase if there's a shared user
    if (account.sharedWithId || account.sharedWithEmail || account.invitationId) {
      console.log(`Updating account ${account.id} to remove sharing information`);
      
      const { error: accountError } = await supabase
        .from('accounts')
        .update({ 
          shared_with_id: null,
          shared_with_email: null,
          invitation_id: null
        })
        .eq('id', account.id);
        
      if (accountError) {
        console.error("Error updating account:", accountError);
        throw accountError;
      }
      console.log("Account updated to remove sharing information");
    }
    
    // Return the updated account object
    const updatedAccount: Account = {
      ...account,
      sharedWithId: undefined,
      sharedWithEmail: undefined,
      invitationId: undefined
    };
    
    console.log("Invitation removal completed successfully");
    return updatedAccount;
  } catch (error) {
    console.error('Failed to remove invitation:', error);
    toast.error('הסרת השותף נכשלה, אנא נסה שוב');
    throw error;
  }
}
