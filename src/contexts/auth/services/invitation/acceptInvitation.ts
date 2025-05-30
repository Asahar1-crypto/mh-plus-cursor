
import { supabase } from "@/integrations/supabase/client";
import { User, Account } from '../../types';
import { toast } from 'sonner';

export async function acceptInvitation(invitationId: string, user: User): Promise<Account> {
  try {
    console.log(`acceptInvitation: User ${user.id} (${user.email}) attempting to accept invitation ${invitationId}`);
    
    if (!invitationId) {
      console.error("acceptInvitation: No invitation ID provided");
      throw new Error('מזהה הזמנה חסר');
    }

    if (!user || !user.id || !user.email) {
      console.error("acceptInvitation: Missing user data", user);
      throw new Error('נתוני משתמש חסרים');
    }
    
    // Get the invitation from the database
    console.log("acceptInvitation: Querying database for invitation:", invitationId);
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
    console.log("acceptInvitation: Processing invitation from database:", invitation);
    
    // Case insensitive comparison for email
    if (invitation.email && invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      console.error(`acceptInvitation: Email mismatch: invitation for ${invitation.email} but user is ${user.email}`);
      throw new Error(`ההזמנה מיועדת ל-${invitation.email} אך אתה מחובר כ-${user.email}`);
    }
    
    const accountId = invitation.account_id;
    
    // Get the existing account that sent the invitation
    console.log(`acceptInvitation: Looking for account with ID: ${accountId}`);
    const { data: accountData, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .maybeSingle();
        
    if (accountError) {
      console.error("acceptInvitation: Error fetching account:", accountError);
      throw new Error('שגיאה בטעינת החשבון: ' + accountError.message);
    }
    
    if (!accountData) {
      console.error(`acceptInvitation: No account found with ID: ${accountId}`);
      
      // Clean up the invalid invitation since the account doesn't exist
      console.log("acceptInvitation: Cleaning up invalid invitation - account doesn't exist");
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
      
      throw new Error('החשבון שהזמין אותך לא קיים יותר במערכת. ההזמנה הוסרה אוטומטית. אנא בקש הזמנה חדשה.');
    }
    
    console.log("acceptInvitation: Found account:", accountData);
    
    // Check if this is the user's own account
    if (accountData.owner_id === user.id) {
      console.error("acceptInvitation: Cannot share account with self");
      throw new Error('לא ניתן לשתף חשבון עם עצמך');
    }
    
    // Check if user is already shared on this account
    if (accountData.shared_with_id === user.id) {
      console.log("acceptInvitation: User is already shared on this account, marking invitation as accepted");
      
      // Just mark invitation as accepted since user is already shared
      const { error: acceptError } = await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('invitation_id', invitation.invitation_id);
        
      if (acceptError) {
        console.error("acceptInvitation: Error accepting invitation:", acceptError);
        throw new Error('שגיאה בסימון ההזמנה כמתקבלת: ' + acceptError.message);
      }
      
      // Get owner profile data
      let ownerName = 'בעל החשבון';
      
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
        console.error("acceptInvitation: Could not fetch owner profile:", error);
      }
      
      // Return existing shared account
      const sharedAccount: Account = {
        id: accountData.id,
        name: accountData.name,
        ownerId: accountData.owner_id,
        ownerName: ownerName,
        sharedWithId: user.id,
        sharedWithEmail: user.email,
        invitationId: invitation.invitation_id,
        isSharedAccount: true
      };
      
      // Clean up sessionStorage
      console.log("acceptInvitation: Clearing temporary invitation data");
      sessionStorage.removeItem('pendingInvitationId');
      sessionStorage.removeItem('pendingInvitationAccountId');
      sessionStorage.removeItem('pendingInvitationOwnerId');
      sessionStorage.removeItem('currentInvitationDetails');
      sessionStorage.removeItem('pendingInvitationRedirectChecked');
      sessionStorage.removeItem('notifiedInvitations');
      
      console.log("acceptInvitation: User already shared on account, returning shared account:", sharedAccount);
      return sharedAccount;
    }
    
    // Update the existing account to include the shared user (don't create a new account)
    console.log("acceptInvitation: Updating existing account with shared user information");
    const { error: updateError } = await supabase
      .from('accounts')
      .update({ 
        shared_with_id: user.id,
        shared_with_email: user.email,
        invitation_id: invitation.invitation_id
      })
      .eq('id', accountId);
      
    if (updateError) {
      console.error("acceptInvitation: Error updating account:", updateError);
      throw new Error('שגיאה בעדכון החשבון: ' + updateError.message);
    }
    
    // Mark invitation as accepted
    console.log("acceptInvitation: Marking invitation as accepted");
    const { error: acceptError } = await supabase
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('invitation_id', invitation.invitation_id);
      
    if (acceptError) {
      console.error("acceptInvitation: Error accepting invitation:", acceptError);
      throw new Error('שגיאה בסימון ההזמנה כמתקבלת: ' + acceptError.message);
    }
    
    // Get owner profile data
    let ownerName = 'בעל החשבון';
    
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
      console.error("acceptInvitation: Could not fetch owner profile:", error);
    }
    
    // Create account object to return (the existing account, not a new one)
    const sharedAccount: Account = {
      id: accountData.id,
      name: accountData.name,
      ownerId: accountData.owner_id,
      ownerName: ownerName,
      sharedWithId: user.id,
      sharedWithEmail: user.email,
      invitationId: invitation.invitation_id,
      isSharedAccount: true
    };
    
    // Clean up sessionStorage
    console.log("acceptInvitation: Clearing temporary invitation data");
    sessionStorage.removeItem('pendingInvitationId');
    sessionStorage.removeItem('pendingInvitationAccountId');
    sessionStorage.removeItem('pendingInvitationOwnerId');
    sessionStorage.removeItem('currentInvitationDetails');
    sessionStorage.removeItem('pendingInvitationRedirectChecked');
    sessionStorage.removeItem('notifiedInvitations');
    
    console.log("acceptInvitation: Invitation accepted successfully, returning shared account:", sharedAccount);
    return sharedAccount;
  } catch (error: any) {
    console.error('acceptInvitation: Failed to accept invitation:', error);
    toast.error(error.message || 'קבלת ההזמנה נכשלה, אנא נסה שוב');
    throw error;
  }
}
