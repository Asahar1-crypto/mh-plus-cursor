
import { supabase } from "@/integrations/supabase/client";
import { User, Account } from '../../types';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sends an invitation to a user to join an account
 */
export async function sendInvitation(email: string, user: User, account: Account): Promise<Account> {
  try {
    console.log(`User ${user.id} (${user.email}) sending invitation to ${email} for account ${account.id}`);
    
    // Generate a unique invitation ID
    const invitationId = uuidv4();
    
    // Create the invitation in Supabase
    const { error: inviteError } = await supabase
      .from('invitations')
      .insert({
        email,
        account_id: account.id,
        invitation_id: invitationId
      });
      
    if (inviteError) {
      console.error("Error creating invitation:", inviteError);
      throw inviteError;
    }
    
    // Update the account with the invitation details
    const { error: updateError } = await supabase
      .from('accounts')
      .update({ 
        invitation_id: invitationId,
        shared_with_email: email
      })
      .eq('id', account.id);
      
    if (updateError) {
      console.error("Error updating account:", updateError);
      throw updateError;
    }
    
    // Return the updated account object
    const updatedAccount: Account = {
      ...account,
      invitationId,
      sharedWithEmail: email
    };
    
    console.log("Invitation sent successfully");
    toast.success('ההזמנה נשלחה בהצלחה!');
    return updatedAccount;
  } catch (error) {
    console.error('Failed to send invitation:', error);
    toast.error('שליחת ההזמנה נכשלה, אנא נסה שוב');
    throw error;
  }
}
