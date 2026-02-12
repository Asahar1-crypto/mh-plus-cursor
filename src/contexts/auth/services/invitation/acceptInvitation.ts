
import { supabase } from "@/integrations/supabase/client";
import { User, Account } from '../../types';
import { toast } from 'sonner';
import { validateAccountExists, getAccountDetails, debugListAllAccounts } from './accountValidator';
import { memberService } from '../account/memberService';

export async function acceptInvitation(invitationId: string, user: User): Promise<Account> {
  try {
    if (!invitationId) {
      console.error("acceptInvitation: No invitation ID provided");
      throw new Error('מזהה הזמנה חסר');
    }

    if (!user || !user.id || !user.email) {
      console.error("acceptInvitation: Missing user data", user);
      throw new Error('נתוני משתמש חסרים');
    }
    
    // Get the invitation from the database
    const { data: invitationData, error: findError } = await supabase
      .from('invitations')
      .select('*')
      .eq('invitation_id', invitationId)
      .is('accepted_at', null)
      .gt('expires_at', 'now()');
      
    if (findError) {
      console.error("acceptInvitation: Error finding invitation:", findError);
      throw new Error('שגיאה בחיפוש ההזמנה: ' + findError.message);
    }
    
    const invitationArray = Array.isArray(invitationData) ? invitationData : (invitationData ? [invitationData] : []);
    
    if (!invitationArray || invitationArray.length === 0) {
      console.error("acceptInvitation: No active invitation found with ID", invitationId);
      throw new Error('ההזמנה לא נמצאה או שפג תוקפה');
    }
    
    const invitation = invitationArray[0];
    
    // Case insensitive comparison for email
    if (invitation.email && invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      console.error(`acceptInvitation: Email mismatch: invitation for ${invitation.email} but user is ${user.email}`);
      throw new Error(`ההזמנה מיועדת ל-${invitation.email} אך אתה מחובר כ-${user.email}`);
    }
    
    const accountId = invitation.account_id;
    
    // Validate account exists first
    const accountExists = await validateAccountExists(accountId);
    if (!accountExists) {
      // Clean up the invalid invitation
      await supabase
        .from('invitations')
        .delete()
        .eq('invitation_id', invitationId);
      
      // Clear any cached invitation data
      sessionStorage.removeItem('pendingInvitationId');
      sessionStorage.removeItem('pendingInvitationAccountId');
      sessionStorage.removeItem('pendingInvitationOwnerId');
      sessionStorage.removeItem('currentInvitationDetails');
      sessionStorage.removeItem('pendingInvitationRedirectChecked');
      sessionStorage.removeItem('notifiedInvitations');
      
      throw new Error(`החשבון שהזמין אותך לא קיים יותר במערכת. ההזמנה הוסרה אוטומטית. אנא בקש הזמנה חדשה.`);
    }
    
    // Get detailed account information
    const accountData = await getAccountDetails(accountId);
    if (!accountData) {
      throw new Error('שגיאה בטעינת פרטי החשבון');
    }
    
    try {
      const { data, error: acceptError } = await supabase.rpc('accept_invitation_and_add_member', {
        invitation_uuid: invitationId,
        user_uuid: user.id
      });
      
      if (acceptError) {
        console.error("acceptInvitation: Error in accept_invitation_and_add_member:", acceptError);
        throw new Error('שגיאה בקבלת ההזמנה: ' + acceptError.message);
      }
      
    } catch (memberError: any) {
      console.error("acceptInvitation: Error accepting invitation and adding member:", memberError);
      throw new Error('שגיאה בקבלת ההזמנה: ' + memberError.message);
    }
    
    // Get the user's role in the account (either from being already a member or newly added)
    const { data: membership } = await supabase
      .from('account_members')
      .select('role')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .single();
    
    const userRole = membership?.role || 'member';
    
    
    // Create account object to return
    const sharedAccount: Account = {
      id: accountData.id,
      name: accountData.name,
      userRole: userRole
    };
    
    // Clear sessionStorage and localStorage invitation data
    sessionStorage.removeItem('pendingInvitationId');
    sessionStorage.removeItem('pendingInvitationAccountId');
    sessionStorage.removeItem('pendingInvitationOwnerId');
    sessionStorage.removeItem('currentInvitationDetails');
    sessionStorage.removeItem('pendingInvitationRedirectChecked');
    sessionStorage.removeItem('notifiedInvitations');
    
    // Clear pending invitations from registration to allow future account creation
    localStorage.removeItem('pendingInvitationsAfterRegistration');
    
    return sharedAccount;
  } catch (error: any) {
    console.error('acceptInvitation: Failed to accept invitation:', error);
    toast.error(error.message || 'קבלת ההזמנה נכשלה, אנא נסה שוב');
    throw error;
  }
}
