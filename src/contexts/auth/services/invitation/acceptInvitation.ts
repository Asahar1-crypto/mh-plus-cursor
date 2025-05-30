
import { supabase } from "@/integrations/supabase/client";
import { User, Account } from '../../types';
import { toast } from 'sonner';

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
    
    // Get the invitation from the database
    console.log("Querying database for invitation:", invitationId);
    const { data: invitationData, error: findError } = await supabase
      .from('invitations')
      .select('*')
      .eq('invitation_id', invitationId)
      .is('accepted_at', null)
      .gt('expires_at', 'now()');
      
    if (findError) {
      console.error("Error finding invitation:", findError);
      throw new Error('שגיאה בחיפוש ההזמנה: ' + findError.message);
    }
    
    const invitationArray = Array.isArray(invitationData) ? invitationData : (invitationData ? [invitationData] : []);
    
    if (!invitationArray || invitationArray.length === 0) {
      console.error("No active invitation found with ID", invitationId);
      throw new Error('ההזמנה לא נמצאה או שפג תוקפה');
    }
    
    const invitation = invitationArray[0];
    console.log("Processing invitation from database:", invitation);
    
    // Case insensitive comparison for email
    if (invitation.email && invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      console.error(`Email mismatch: invitation for ${invitation.email} but user is ${user.email}`);
      throw new Error(`ההזמנה מיועדת ל-${invitation.email} אך אתה מחובר כ-${user.email}`);
    }
    
    const accountId = invitation.account_id;
    
    // Try to get account data, but proceed even if missing
    let accountData = null;
    try {
      const { data: fetchedAccount, error: accountError } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .single();
        
      if (!accountError && fetchedAccount) {
        accountData = fetchedAccount;
      } else {
        console.warn("Account data not found, but proceeding with invitation acceptance");
      }
    } catch (err) {
      console.warn("Error fetching account data, but proceeding:", err);
    }
    
    // Check if this is the user's own account (if we have account data)
    if (accountData && accountData.owner_id === user.id) {
      console.error("Cannot share account with self");
      throw new Error('לא ניתן לשתף חשבון עם עצמך');
    }
    
    // If account exists, update it with shared information
    if (accountData) {
      console.log("Updating existing account with user information");
      const { error: updateError } = await supabase
        .from('accounts')
        .update({ 
          shared_with_id: user.id,
          shared_with_email: user.email,
          invitation_id: invitation.invitation_id
        })
        .eq('id', accountId);
        
      if (updateError) {
        console.error("Error updating account:", updateError);
        throw new Error('שגיאה בעדכון החשבון: ' + updateError.message);
      }
    } else {
      // If account doesn't exist, create a new shared account for this user
      console.log("Creating new account for shared access");
      const { data: newAccount, error: createError } = await supabase
        .from('accounts')
        .insert({
          name: `חשבון משותף (${invitation.email})`,
          owner_id: user.id,
          shared_with_id: user.id,
          shared_with_email: user.email,
          invitation_id: invitation.invitation_id
        })
        .select()
        .single();
        
      if (createError) {
        console.error("Error creating new account:", createError);
        throw new Error('שגיאה ביצירת חשבון חדש: ' + createError.message);
      }
      
      accountData = newAccount;
    }
    
    // Mark invitation as accepted
    console.log("Marking invitation as accepted");
    await supabase
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('invitation_id', invitation.invitation_id);
      
    // Get owner profile data if we have owner_id
    let ownerName = 'בעל החשבון';
    
    if (accountData && accountData.owner_id) {
      try {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', accountData.owner_id)
          .maybeSingle();
          
        if (ownerProfile && ownerProfile.name) {
          ownerName = ownerProfile.name;
        }
      } catch (error) {
        console.error("Could not fetch owner profile:", error);
      }
    }
    
    // Create account object to return
    const sharedAccount: Account = {
      id: accountId,
      name: accountData?.name || 'חשבון משותף',
      ownerId: accountData?.owner_id || user.id,
      ownerName: ownerName,
      sharedWithId: user.id,
      sharedWithEmail: user.email,
      invitationId: invitation.invitation_id,
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
    
    console.log("Invitation accepted successfully, returning shared account:", sharedAccount);
    toast.success('הצטרפת לחשבון בהצלחה!');
    return sharedAccount;
  } catch (error: any) {
    console.error('Failed to accept invitation:', error);
    toast.error(error.message || 'קבלת ההזמנה נכשלה, אנא נסה שוב');
    throw error;
  }
}
