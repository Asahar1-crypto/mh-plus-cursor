
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
    
    // CRITICAL FIX: Modified query to properly join accounts data
    const { data: invitations, error: findError } = await supabase
      .from('invitations')
      .select('*, accounts(id, name, owner_id)')
      .eq('invitation_id', invitationId)
      .is('accepted_at', null)
      .gt('expires_at', 'now()');
      
    if (findError) {
      console.error("Error finding invitation:", findError);
      throw findError;
    }
    
    let accountId = null;
    let ownerAccountId = null;
    let accountName = null;
    let ownerId = null;
    
    if (!invitations || invitations.length === 0) {
      console.log("Invitation not found or expired in database, checking localStorage");
      
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
      
      // Get accountId and ownerId from localStorage or sessionStorage
      accountId = localInvitation.accountId;
      ownerId = localInvitation.ownerId;
      accountName = localInvitation.name || 'חשבון משותף';
      
      // Check sessionStorage if missing information
      if (!accountId) {
        accountId = sessionStorage.getItem('pendingInvitationAccountId');
      }
      
      if (!ownerId) {
        ownerId = sessionStorage.getItem('pendingInvitationOwnerId');
      }
      
      console.log("Looking for account using accountId:", accountId, "ownerId:", ownerId);
      
      if (!accountId) {
        console.error("Missing critical account information (accountId)");
        throw new Error('חסר מידע חיוני להצטרפות לחשבון, אנא בקש הזמנה חדשה');
      }
    } else {
      // If we reach here, we found the invitation in the database
      const invitation = invitations[0];
      console.log("Found invitation in database:", invitation);
      
      // CRITICAL FIX: Access accounts data directly from the joined data
      const account = invitation.accounts;
      console.log("Retrieved account data:", account);
      
      if (!account || !account.id) {
        console.error("Account information not found in invitation");
        
        // Try with account_id directly from invitation as fallback
        accountId = invitation.account_id;
        console.log("Falling back to invitation.account_id:", accountId);
        
        // Fetch the account separately
        if (accountId) {
          const { data: accountData, error: accountError } = await supabase
            .from('accounts')
            .select('*')
            .eq('id', accountId)
            .single();
            
          if (!accountError && accountData) {
            console.log("Successfully retrieved account data:", accountData);
            ownerId = accountData.owner_id;
            accountName = accountData.name;
          } else {
            console.error("Failed to retrieve account data:", accountError);
            // Try sessionStorage as last resort
            ownerId = sessionStorage.getItem('pendingInvitationOwnerId');
          }
        } else {
          // As last resort, try sessionStorage
          accountId = sessionStorage.getItem('pendingInvitationAccountId');
          ownerId = sessionStorage.getItem('pendingInvitationOwnerId');
        }
        
        if (!accountId) {
          throw new Error('מידע החשבון לא נמצא בהזמנה');
        }
      } else {
        // Use the account information from the database
        accountId = account.id;
        ownerId = account.owner_id;
        accountName = account.name;
        
        // Validate that the invitation is for this user - Case insensitive email comparison
        if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
          console.error(`Email mismatch: invitation for ${invitation.email} but user is ${user.email}`);
          throw new Error(`ההזמנה מיועדת ל-${invitation.email} אך אתה מחובר כ-${user.email}`);
        }
      }
    }
    
    // Check if this account already belongs to the current user
    if (ownerId === user.id) {
      console.error("Cannot share account with yourself");
      throw new Error('לא ניתן לשתף חשבון עם עצמך');
    }
    
    // CRITICAL FIX: Find the account using the accountId we have
    const { data: existingAccount, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single();
    
    if (accountError || !existingAccount) {
      console.error("Error finding account:", accountError);
      throw new Error('החשבון לא נמצא, אנא בקש הזמנה חדשה');
    }
    
    console.log("Found existing account:", existingAccount);
    
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
      name: accountName || existingAccount.name,
      ownerId: ownerId,
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
