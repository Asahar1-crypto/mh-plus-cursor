
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
    
    // In a real implementation with Supabase, we'd mark the invitation as deleted or remove it
    if (account.invitationId) {
      // Remove the invitation from supabase
      const { error } = await supabase
        .from('invitations')
        .update({ accepted_at: null }) // Set to null to indicate it was revoked
        .eq('invitation_id', account.invitationId);
        
      if (error) {
        console.error("Error updating invitation:", error);
        throw error;
      }
      
      // Remove from localStorage for the demo
      try {
        const pendingInvitations = JSON.parse(localStorage.getItem('pendingInvitations') || '{}') as Record<string, PendingInvitationRecord>;
        delete pendingInvitations[account.invitationId];
        localStorage.setItem('pendingInvitations', JSON.stringify(pendingInvitations));
        console.log("Removed invitation from localStorage");
      } catch (storageError) {
        console.error("Error updating localStorage:", storageError);
      }
    }
    
    // Update the account in Supabase if there's a shared user
    if (account.sharedWithId || account.sharedWithEmail || account.invitationId) {
      const { error } = await supabase
        .from('accounts')
        .update({ 
          shared_with_id: null,
          shared_with_email: null,
          invitation_id: null
        })
        .eq('id', account.id);
        
      if (error) {
        console.error("Error updating account:", error);
        throw error;
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
