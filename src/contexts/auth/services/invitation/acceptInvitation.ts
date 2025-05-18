import { supabase } from "@/integrations/supabase/client";
import { User, Account } from '../../types';
import { toast } from 'sonner';
import { AcceptInvitationParams, AcceptInvitationResult } from './rpcTypes';

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
    
    // Get the invitation from the database with explicit join conditions and simplified query
    console.log("Querying database for invitation:", invitationId);
    const { data: invitationData, error: findError } = await supabase
      .from('invitations')
      .select(`
        *,
        accounts:account_id (*)
      `)
      .eq('invitation_id', invitationId)
      .is('accepted_at', null)
      .gt('expires_at', 'now()');
      
    if (findError) {
      console.error("Error finding invitation:", findError);
      throw new Error('שגיאה בחיפוש ההזמנה: ' + findError.message);
    }
    
    // Convert to array if needed and check length
    const invitationArray = Array.isArray(invitationData) ? invitationData : (invitationData ? [invitationData] : []);
    
    if (!invitationArray || invitationArray.length === 0) {
      console.error("No active invitation found with ID", invitationId);
      throw new Error('ההזמנה לא נמצאה או שפג תוקפה');
    }
    
    // Process invitation data from the database
    const invitation = invitationArray[0];
    console.log("Processing invitation from database:", invitation);
    
    // Case insensitive comparison for email
    if (invitation.email && invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      console.error(`Email mismatch: invitation for ${invitation.email} but user is ${user.email}`);
      throw new Error(`ההזמנה מיועדת ל-${invitation.email} אך אתה מחובר כ-${user.email}`);
    }
    
    // Enhance account data validation
    if (!invitation.accounts || !invitation.account_id) {
      console.error("Invitation found but account data is missing or incomplete");
      
      // Try to fetch account data directly
      try {
        const { data: accountData, error: accountError } = await supabase
          .from('accounts')
          .select('*')
          .eq('id', invitation.account_id);
          
        if (accountError) {
          console.error("Failed to fetch account data:", accountError);
          throw new Error('חסר מידע חיוני על החשבון, אנא בקש הזמנה חדשה');
        }
        
        if (!accountData || accountData.length === 0) {
          console.error("No account data found for account_id:", invitation.account_id);
          throw new Error('חסר מידע חיוני על החשבון, אנא בקש הזמנה חדשה');
        }
        
        // Replace with complete account data
        invitation.accounts = accountData[0];
      } catch (err) {
        console.error("Error in account data fallback fetch:", err);
        throw new Error('חסר מידע חיוני על החשבון, אנא בקש הזמנה חדשה');
      }
    }
    
    if (!invitation.accounts.id || !invitation.accounts.owner_id) {
      console.error("Critical account data still missing after fetch attempt");
      throw new Error('חסר מידע חיוני על החשבון, אנא בקש הזמנה חדשה');
    }
    
    const accountId = invitation.account_id;
    
    // Check if this account already belongs to the current user
    if (invitation.accounts.owner_id === user.id) {
      console.error("Cannot share account with self");
      throw new Error('לא ניתן לשתף חשבון עם עצמך');
    }
    
    // IMPROVEMENT: Check if the user already has their own account, we might need to handle this special case
    console.log("Checking if user has their own account before updating shared account");
    const { data: existingUserAccounts } = await supabase
      .from('accounts')
      .select('*')
      .eq('owner_id', user.id);
    
    // If the user has their own account and it's a default account (created automatically), 
    // we'll keep it for now but make the shared account the primary one
    if (existingUserAccounts && existingUserAccounts.length > 0) {
      console.log(`User has ${existingUserAccounts.length} existing accounts`);
      // We don't delete the account yet, but we could add functionality to merge or manage multiple accounts
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
      
    // Get owner profile data
    let ownerName = 'בעל החשבון';
    
    // Fetch owner profile directly for reliability
    try {
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', invitation.accounts.owner_id)
        .maybeSingle();
        
      if (ownerProfile && ownerProfile.name) {
        ownerName = ownerProfile.name;
      }
    } catch (error) {
      console.error("Could not fetch owner profile:", error);
      // Continue with default name
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
