
import { supabase } from "@/integrations/supabase/client";
import { Account } from '../../types';
import { toast } from 'sonner';

/**
 * Removes an invitation and clears sharing information from an account
 */
export async function removeInvitation(account: Account) {
  try {
    if (!account || !account.id) {
      throw new Error('חסרים פרטי חשבון');
    }
    
    console.log(`Removing invitation for account ${account.id}`);
    
    // Transaction to ensure consistency between invitation update and account update
    const { data: transaction, error: transactionError } = await supabase
      .rpc('remove_invitation_and_update_account', {
        p_account_id: account.id
      } as {
        p_account_id: string;
      });
      
    if (transactionError) {
      console.error("Transaction error:", transactionError);
      throw transactionError;
    }
    
    console.log('Invitation removal transaction completed successfully:', transaction);
    
    // Return the updated account object
    const updatedAccount = {
      ...account,
      invitationId: null,
      sharedWithEmail: null,
      sharedWithId: null,
      sharedWithName: null
    };
    
    toast.success('השותף הוסר בהצלחה');
    return updatedAccount;
  } catch (error) {
    console.error('Failed to remove invitation:', error);
    toast.error('הסרת השותף נכשלה, אנא נסה שוב');
    throw error;
  }
}
