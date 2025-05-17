
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
    
    // IMPORTANT: Modified to fix issue with fetching account data
    const { data: invitationData, error: findError } = await supabase
      .from('invitations')
      .select('id, account_id, email, invitation_id, accepted_at, expires_at')
      .eq('invitation_id', invitationId)
      .is('accepted_at', null)
      .gt('expires_at', 'now()')
      .single();
      
    if (findError || !invitationData) {
      console.error("Error or no data when finding invitation:", findError);
      
      // Check localStorage as fallback
      const pendingInvitationsData = localStorage.getItem('pendingInvitations');
      if (!pendingInvitationsData) {
        console.error("No pending invitations found in localStorage");
        throw new Error('ההזמנה לא נמצאה או שפג תוקפה');
      }
      
      const pendingInvitations = JSON.parse(pendingInvitationsData);
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
      const accountName = localInvitation.name || 'חשבון משותף';
      const ownerId = localInvitation.ownerId;
      
      if (!accountId) {
        console.error("Missing critical account information (accountId)");
        throw new Error('חסר מידע חיוני להצטרפות לחשבון, אנא בקש הזמנה חדשה');
      }
      
      // Fetch account information directly
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .single();
        
      if (accountError || !accountData) {
        console.error("Error finding account:", accountError);
        throw new Error('החשבון לא נמצא, אנא בקש הזמנה חדשה');
      }
      
      console.log("Found existing account:", accountData);
      
      // Check if this account already belongs to the current user
      if (accountData.owner_id === user.id) {
        console.error("Cannot share account with yourself");
        throw new Error('לא ניתן לשתף חשבון עם עצמך');
      }
      
      // Update the existing account to add the user
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
        throw updateError;
      }
      
      // Mark the invitation as accepted if it exists in the database
      const { error: acceptError } = await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('invitation_id', invitationId);
        
      if (acceptError) {
        console.warn("Error marking invitation as accepted, but account was updated:", acceptError);
      }
      
      // Create account object to return
      const sharedAccount: Account = {
        id: accountId,
        name: accountName || accountData.name,
        ownerId: accountData.owner_id,
        ownerName: null, // This will be fetched separately if needed
        sharedWithId: user.id,
        sharedWithEmail: user.email,
        invitationId: invitationId,
        isSharedAccount: true // Mark this as a shared account for the current user
      };
      
      // Remove from localStorage
      removePendingInvitation(invitationId);
      
      // Clear sessionStorage
      sessionStorage.removeItem('pendingInvitationAccountId');
      sessionStorage.removeItem('pendingInvitationOwnerId');
      
      console.log("Invitation acceptance completed successfully");
      toast.success('הצטרפת לחשבון בהצלחה!');
      return sharedAccount;
    }
    
    // If we reach here, we found the invitation in the database
    console.log("Found invitation in database:", invitationData);
    
    // Validate that the invitation is for this user - Case insensitive email comparison
    if (invitationData.email.toLowerCase() !== user.email.toLowerCase()) {
      console.error(`Email mismatch: invitation for ${invitationData.email} but user is ${user.email}`);
      throw new Error(`ההזמנה מיועדת ל-${invitationData.email} אך אתה מחובר כ-${user.email}`);
    }
    
    // Get the account directly using the account_id from the invitation
    const accountId = invitationData.account_id;
    
    if (!accountId) {
      console.error("Account ID missing from invitation");
      throw new Error('מידע החשבון לא נמצא בהזמנה');
    }
    
    // Fetch the account information directly
    const { data: accountData, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single();
      
    if (accountError || !accountData) {
      console.error("Error finding account:", accountError);
      throw new Error('החשבון לא נמצא, אנא בקש הזמנה חדשה');
    }
    
    console.log("Found existing account:", accountData);
    
    // Check if this account already belongs to the current user
    if (accountData.owner_id === user.id) {
      console.error("Cannot share account with yourself");
      throw new Error('לא ניתן לשתף חשבון עם עצמך');
    }
    
    // Update the existing account to add the user
    const { error: updateError } = await supabase
      .from('accounts')
      .update({ 
        shared_with_id: user.id,
        shared_with_email: user.email,
        invitation_id: invitationData.invitation_id
      })
      .eq('id', accountId);
      
    if (updateError) {
      console.error("Error updating account:", updateError);
      throw updateError;
    }
    
    // Mark the invitation as accepted
    const { error: acceptError } = await supabase
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('invitation_id', invitationId);
      
    if (acceptError) {
      console.error("Error marking invitation as accepted:", acceptError);
      // Don't throw here, the account update is more important and already succeeded
    }
    
    // Create account object to return
    const sharedAccount: Account = {
      id: accountId,
      name: accountData.name,
      ownerId: accountData.owner_id,
      ownerName: null, // This will be fetched separately if needed
      sharedWithId: user.id,
      sharedWithEmail: user.email,
      invitationId: invitationId,
      isSharedAccount: true // Mark this as a shared account for the current user
    };
    
    // Remove from localStorage
    removePendingInvitation(invitationId);
    
    // Clear sessionStorage
    sessionStorage.removeItem('pendingInvitationAccountId');
    sessionStorage.removeItem('pendingInvitationOwnerId');
    
    console.log("Invitation acceptance completed successfully");
    toast.success('הצטרפת לחשבון בהצלחה!');
    return sharedAccount;
  } catch (error: any) {
    console.error('Failed to accept invitation:', error);
    toast.error(error.message || 'קבלת ההזמנה נכשלה, אנא נסה שוב');
    throw error;
  }
}
