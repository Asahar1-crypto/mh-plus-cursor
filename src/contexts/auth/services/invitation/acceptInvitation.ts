
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
    
    // Get the invitation from the database with improved query
    console.log("Querying database for invitation:", invitationId);
    const { data: invitationData, error: findError } = await supabase
      .from('invitations')
      .select(`
        id, 
        account_id, 
        email, 
        invitation_id, 
        accepted_at, 
        expires_at,
        accounts:account_id (
          id,
          name,
          owner_id,
          profiles!accounts_owner_id_fkey (
            id,
            name
          )
        )
      `)
      .eq('invitation_id', invitationId)
      .is('accepted_at', null)
      .gt('expires_at', 'now()')
      .limit(1)
      .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no data is found
      
    if (findError) {
      console.error("Error finding invitation:", findError);
      throw new Error('שגיאה בחיפוש ההזמנה: ' + findError.message);
    }
    
    if (!invitationData) {
      console.error("No active invitation found with ID", invitationId);
      throw new Error('ההזמנה לא נמצאה או שפג תוקפה');
    }
    
    // Process invitation data from the database
    const invitation = invitationData;
    console.log("Processing invitation from database:", invitation);
    
    // Case insensitive comparison for email
    if (invitation.email && invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      console.error(`Email mismatch: invitation for ${invitation.email} but user is ${user.email}`);
      throw new Error(`ההזמנה מיועדת ל-${invitation.email} אך אתה מחובר כ-${user.email}`);
    }
    
    if (!invitation.accounts || !invitation.account_id) {
      console.error("Invitation found but account data is missing");
      throw new Error('חסר מידע חיוני על החשבון, אנא בקש הזמנה חדשה');
    }
    
    const accountId = invitation.account_id;
    
    // Check if this account already belongs to the current user
    if (invitation.accounts.owner_id === user.id) {
      console.error("Cannot share account with self");
      throw new Error('לא ניתן לשתף חשבון עם עצמך');
    }
    
    // Update the account to link with the current user
    console.log("Updating account with user information");
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
    
    // Mark invitation as accepted
    console.log("Marking invitation as accepted");
    await supabase
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('invitation_id', invitation.invitation_id);
      
    // Get owner name
    let ownerName = 'בעל החשבון';
    
    // Fix here: Check if profiles exists and if it's an array before accessing length
    if (invitation.accounts.profiles) {
      // Handle both array and object structures
      if (Array.isArray(invitation.accounts.profiles)) {
        if (invitation.accounts.profiles.length > 0) {
          ownerName = invitation.accounts.profiles[0]?.name || 'בעל החשבון';
        }
      } else {
        // If it's an object with an id property, it's a single profile
        if (invitation.accounts.profiles.id) {
          ownerName = invitation.accounts.profiles.name || 'בעל החשבון';
        }
      }
    }
    
    // Create account object to return
    const sharedAccount: Account = {
      id: accountId,
      name: invitation.accounts.name || 'חשבון משותף',
      ownerId: invitation.accounts.owner_id,
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
    
    console.log("Invitation accepted successfully");
    toast.success('הצטרפת לחשבון בהצלחה!');
    return sharedAccount;
  } catch (error: any) {
    console.error('Failed to accept invitation:', error);
    toast.error(error.message || 'קבלת ההזמנה נכשלה, אנא נסה שוב');
    throw error;
  }
}
