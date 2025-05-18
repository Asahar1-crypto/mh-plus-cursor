
import { supabase } from "@/integrations/supabase/client";
import { User, Account } from '../../types';
import { toast } from 'sonner';
import { InvitationRecord, AccountRecord, PendingInvitationRecord } from './types';
import { removePendingInvitation } from '@/utils/notifications';

/**
 * Accepts an invitation and updates the account
 */
export async function acceptInvitation(invitationId: string, user: User): Promise<Account> {
  try {
    console.log(`User ${user.id} (${user.email}) attempting to accept invitation ${invitationId}`);
    
    // First try to get the invitation from the database
    const { data: invitationData, error: findError } = await supabase
      .from('invitations')
      .select('id, account_id, email, invitation_id, accepted_at, expires_at')
      .eq('invitation_id', invitationId)
      .is('accepted_at', null)
      .gt('expires_at', 'now()');
      
    if (findError) {
      console.error("Error finding invitation:", findError);
      throw new Error('שגיאה בחיפוש ההזמנה: ' + findError.message);
    }
    
    if (!invitationData || invitationData.length === 0) {
      console.warn("Could not find invitation in database, trying localStorage...");
      
      // Try to get invitation details from localStorage as backup
      const pendingInvitationsData = localStorage.getItem('pendingInvitations');
      if (!pendingInvitationsData) {
        console.error("No pending invitations found in localStorage");
        throw new Error('ההזמנה לא נמצאה או שפג תוקפה');
      }
      
      try {
        const pendingInvitations = JSON.parse(pendingInvitationsData) as Record<string, PendingInvitationRecord>;
        const localInvitation = pendingInvitations[invitationId];
        
        if (!localInvitation) {
          console.error(`Invitation ${invitationId} not found in localStorage`);
          throw new Error('ההזמנה לא נמצאה או שפג תוקפה');
        }
        
        console.log("Found invitation in localStorage:", localInvitation);
        
        // Case insensitive comparison for email
        if (localInvitation.sharedWithEmail && 
            localInvitation.sharedWithEmail.toLowerCase() !== user.email.toLowerCase()) {
          console.error(`Email mismatch: invitation for ${localInvitation.sharedWithEmail} but user is ${user.email}`);
          throw new Error(`ההזמנה מיועדת ל-${localInvitation.sharedWithEmail} אך אתה מחובר כ-${user.email}`);
        }
        
        // Get accountId from localStorage
        const accountId = localInvitation.accountId;
        
        if (!accountId) {
          console.error("Missing accountId in localStorage invitation");
          throw new Error('חסר מידע חיוני להצטרפות לחשבון, אנא בקש הזמנה חדשה');
        }
        
        // Fetch account information
        const { data: accountData, error: accountError } = await supabase
          .from('accounts')
          .select('*')
          .eq('id', accountId);
          
        if (accountError) {
          console.error("Error finding account:", accountError);
          throw new Error('שגיאה בחיפוש החשבון: ' + accountError.message);
        }
        
        if (!accountData || accountData.length === 0) {
          console.error("Account not found");
          throw new Error('החשבון לא נמצא, אנא בקש הזמנה חדשה');
        }
        
        const account = accountData[0];
        console.log("Found account:", account);
        
        // Check if this account already belongs to the current user
        if (account.owner_id === user.id) {
          console.error("Cannot share account with self");
          throw new Error('לא ניתן לשתף חשבון עם עצמך');
        }
        
        // Update the account to link with the current user
        const { error: updateError } = await supabase
          .from('accounts')
          .update({ 
            shared_with_id: user.id,
            shared_with_email: user.email,
            invitation_id: invitationId
          })
          .eq('id', accountId);
          
        if (updateError) {
          console.error("Error updating account:", updateError);
          throw new Error('שגיאה בעדכון החשבון: ' + updateError.message);
        }
        
        // Try to add or update the invitation in the database
        try {
          // First check if the invitation exists
          const { data: existingInv } = await supabase
            .from('invitations')
            .select('*')
            .eq('invitation_id', invitationId);
            
          if (!existingInv || existingInv.length === 0) {
            // Create the invitation record
            await supabase
              .from('invitations')
              .insert({
                invitation_id: invitationId,
                account_id: accountId,
                email: user.email.toLowerCase(),
                accepted_at: new Date().toISOString()
              });
          } else {
            // Mark invitation as accepted
            await supabase
              .from('invitations')
              .update({ accepted_at: new Date().toISOString() })
              .eq('invitation_id', invitationId);
          }
        } catch (invError) {
          // Just log this error but don't fail the process
          console.warn("Could not update invitation in database, but account was updated:", invError);
        }

        // Get owner name
        let ownerName = localInvitation.ownerName || 'בעל החשבון';
        
        if (account.owner_id) {
          const { data: ownerData } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', account.owner_id)
            .single();
            
          if (ownerData) {
            ownerName = ownerData.name;
          }
        }
        
        // Create account object to return
        const sharedAccount: Account = {
          id: accountId,
          name: account.name || localInvitation.name || 'חשבון משותף',
          ownerId: account.owner_id,
          ownerName: ownerName,
          sharedWithId: user.id,
          sharedWithEmail: user.email,
          invitationId: invitationId,
          isSharedAccount: true
        };
        
        // Clean up localStorage and sessionStorage
        removePendingInvitation(invitationId);
        sessionStorage.removeItem('pendingInvitationAccountId');
        sessionStorage.removeItem('pendingInvitationOwnerId');
        
        console.log("Invitation accepted successfully (localStorage path)");
        toast.success('הצטרפת לחשבון בהצלחה!');
        return sharedAccount;
      } catch (error: any) {
        console.error("Error processing invitation from localStorage:", error);
        throw error;
      }
    }
    
    // Process invitation data from the database
    const invitation = invitationData[0];
    console.log("Processing invitation from database:", invitation);
    
    // Case insensitive comparison for email
    if (invitation.email && invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      console.error(`Email mismatch: invitation for ${invitation.email} but user is ${user.email}`);
      throw new Error(`ההזמנה מיועדת ל-${invitation.email} אך אתה מחובר כ-${user.email}`);
    }
    
    // Fetch account information
    const { data: accountData, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', invitation.account_id);
      
    if (accountError || !accountData || accountData.length === 0) {
      console.error("Error finding account:", accountError);
      throw new Error('החשבון לא נמצא, אנא בקש הזמנה חדשה');
    }
    
    const account = accountData[0];
    
    // Check if this account already belongs to the current user
    if (account.owner_id === user.id) {
      console.error("Cannot share account with self");
      throw new Error('לא ניתן לשתף חשבון עם עצמך');
    }
    
    // Update the account to link with the current user
    const { error: updateError } = await supabase
      .from('accounts')
      .update({ 
        shared_with_id: user.id,
        shared_with_email: user.email,
        invitation_id: invitation.invitation_id
      })
      .eq('id', invitation.account_id);
      
    if (updateError) {
      console.error("Error updating account:", updateError);
      throw new Error('שגיאה בעדכון החשבון: ' + updateError.message);
    }
    
    // Mark invitation as accepted
    await supabase
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('invitation_id', invitation.invitation_id);
      
    // Get owner name
    let ownerName = 'בעל החשבון';
    
    if (account.owner_id) {
      const { data: ownerData } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', account.owner_id)
        .single();
        
      if (ownerData) {
        ownerName = ownerData.name;
      }
    }
    
    // Create account object to return
    const dbSharedAccount: Account = {
      id: invitation.account_id,
      name: account.name || 'חשבון משותף',
      ownerId: account.owner_id,
      ownerName: ownerName,
      sharedWithId: user.id,
      sharedWithEmail: user.email,
      invitationId: invitation.invitation_id,
      isSharedAccount: true
    };
    
    removePendingInvitation(invitation.invitation_id);
    toast.success('הצטרפת לחשבון בהצלחה!');
    return dbSharedAccount;
  } catch (error: any) {
    console.error('Failed to accept invitation:', error);
    toast.error(error.message || 'קבלת ההזמנה נכשלה, אנא נסה שוב');
    throw error;
  }
}
