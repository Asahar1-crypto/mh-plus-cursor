
import { supabase } from "@/integrations/supabase/client";
import { Account } from '../../types';
import { toast } from 'sonner';
import { PendingInvitationRecord } from './types';
import { RemoveInvitationParams, RemoveInvitationResult } from './rpcTypes';

/**
 * Removes an invitation and updates the account
 */
export async function removeInvitation(account: Account): Promise<Account> {
  try {
    console.log("Removing invitation from account:", account);
    
    if (!account) {
      throw new Error("Cannot remove invitation: No account provided");
    }
    
    // First delete the invitation from the database if it exists
    if (account.invitationId) {
      console.log(`Removing invitation with ID: ${account.invitationId}`);
      
      // Delete the invitation from Supabase
      const { error: invitationError } = await supabase
        .from('invitations')
        .delete()
        .eq('invitation_id', account.invitationId);
        
      if (invitationError) {
        console.error("Error deleting invitation:", invitationError);
        throw invitationError;
      }
      
      console.log("Successfully deleted invitation from database");
      
      // Clean up localStorage for the demo
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
      console.log("No invitation ID found in the account, querying for invitations by account ID");
      
      // Try to find and delete any invitations associated with this account
      const { data: invitations, error: findError } = await supabase
        .from('invitations')
        .select('invitation_id')
        .eq('account_id', account.id);
        
      if (!findError && invitations && invitations.length > 0) {
        console.log(`Found ${invitations.length} invitations to delete for account ${account.id}`);
        
        // Delete all invitations for this account
        const { error: deleteError } = await supabase
          .from('invitations')
          .delete()
          .eq('account_id', account.id);
          
        if (deleteError) {
          console.error("Error deleting invitations:", deleteError);
          // Continue execution even if deletion fails
        } else {
          console.log("Successfully deleted all invitations for this account");
        }
      }
    }
    
    // Update the account in Supabase to remove sharing information
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
