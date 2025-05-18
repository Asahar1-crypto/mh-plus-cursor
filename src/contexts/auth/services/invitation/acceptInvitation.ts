
import { supabase } from "@/integrations/supabase/client";
import { User, Account } from '../../types';
import { toast } from 'sonner';

/**
 * Accepts an invitation and updates the account
 */
export async function acceptInvitation(invitationId: string, user: User): Promise<Account> {
  try {
    console.log(`User ${user.id} (${user.email}) attempting to accept invitation ${invitationId}`);
    
    if (!invitationId) {
      console.error("No invitation ID provided");
      throw new Error('מזהה הזמנה חסר');
    }

    if (!user || !user.id || !user.email) {
      console.error("Missing user data", user);
      throw new Error('נתוני משתמש חסרים');
    }
    
    // Transaction to ensure data consistency
    const { data: transaction, error: transactionError } = await supabase
      .rpc('accept_invitation_and_update_account', {
        p_invitation_id: invitationId,
        p_user_id: user.id,
        p_user_email: user.email.toLowerCase()
      });
      
    if (transactionError) {
      console.error("Transaction error:", transactionError);
      throw new Error(transactionError.message || 'שגיאה בקבלת ההזמנה');
    }
    
    if (!transaction || !transaction.account_id) {
      throw new Error('חסר מידע חיוני על החשבון, אנא בקש הזמנה חדשה');
    }
    
    // Get account data with owner information
    const { data: accountData, error: accountError } = await supabase
      .from('accounts')
      .select(`
        *,
        owner_profile:profiles!accounts_owner_id_fkey (name)
      `)
      .eq('id', transaction.account_id)
      .single();
      
    if (accountError || !accountData) {
      console.error("Error fetching account data:", accountError);
      throw new Error('חסר מידע חיוני על החשבון, אנא בקש הזמנה חדשה');
    }
    
    // Create account object to return
    const sharedAccount: Account = {
      id: accountData.id,
      name: accountData.name || 'חשבון משותף',
      ownerId: accountData.owner_id,
      ownerName: accountData.owner_profile?.name || 'בעל החשבון',
      sharedWithId: user.id,
      sharedWithEmail: user.email,
      invitationId: invitationId,
      isSharedAccount: true
    };
    
    // Clean up sessionStorage
    console.log("Clearing temporary invitation data");
    sessionStorage.removeItem('pendingInvitationId');
    sessionStorage.removeItem('pendingInvitationAccountId');
    sessionStorage.removeItem('pendingInvitationOwnerId');
    sessionStorage.removeItem('currentInvitationDetails');
    sessionStorage.removeItem('pendingInvitationRedirectChecked');
    sessionStorage.removeItem('notifiedInvitations');
    
    console.log("Invitation accepted successfully");
    toast.success('הצטרפת לחשבון בהצלחה!');
    return sharedAccount;
  } catch (error: any) {
    console.error('Failed to accept invitation:', error);
    toast.error(error.message || 'קבלת ההזמנה נכשלה, אנא נסה שוב');
    throw error;
  }
}
