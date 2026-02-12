import { supabase } from "@/integrations/supabase/client";
import { Account } from '../../types';

export async function removeInvitation(account: Account): Promise<void> {
  try {
    if (!account || !account.id) {
      console.error("removeInvitation: No account provided");
      throw new Error('נתונים חסרים להסרת ההזמנה');
    }

    // Remove any pending invitations for this account
    const { error: deleteError } = await supabase
      .from('invitations')
      .delete()
      .eq('account_id', account.id)
      .is('accepted_at', null); // Only remove pending invitations

    if (deleteError) {
      console.error("removeInvitation: Error deleting invitations:", deleteError);
      throw new Error('שגיאה בהסרת ההזמנה: ' + deleteError.message);
    }

    // Clear the shared_with_email and invitation_id from the account
    const { error: updateError } = await supabase
      .from('accounts')
      .update({ 
        shared_with_email: null,
        shared_with_id: null,
        invitation_id: null
      })
      .eq('id', account.id);

    if (updateError) {
      console.error("removeInvitation: Error updating account:", updateError);
      throw new Error('שגיאה בעדכון החשבון: ' + updateError.message);
    }

  } catch (error: any) {
    console.error('removeInvitation: Failed to remove invitation:', error);
    throw error;
  }
}