
import { supabase } from "@/integrations/supabase/client";
import { Account } from '../../types';
import { toast } from 'sonner';

interface RemoveInvitationResponse {
  success: boolean;
  account_id: string;
}

interface RemoveInvitationParams {
  p_account_id: string;
}

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
    const params: RemoveInvitationParams = {
      p_account_id: account.id
    };
    
    const { data, error: transactionError } = await supabase
      .rpc('remove_invitation_and_update_account', params as any);
      
    if (transactionError) {
      console.error("Transaction error:", transactionError);
      throw transactionError;
    }
    
    const transaction = data as RemoveInvitationResponse;
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
