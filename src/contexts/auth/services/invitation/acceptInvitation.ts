
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
    
    // Find the invitation in Supabase
    const { data: invitations, error: findError } = await supabase
      .from('invitations')
      .select(`
        *,
        accounts:account_id (
          id,
          name,
          owner_id
        )
      `)
      .eq('invitation_id', invitationId)
      .is('accepted_at', null)
      .gt('expires_at', 'now()');
      
    if (findError) {
      console.error("Error finding invitation:", findError);
      throw findError;
    }
    
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
      
      // Check if we have stored the account_id in localStorage or sessionStorage
      let accountId = localInvitation.accountId;
      if (!accountId) {
        accountId = sessionStorage.getItem('pendingInvitationAccountId');
      }
      
      console.log("Looking for account using accountId:", accountId);
      
      // If we have an account ID, try to find the account
      if (accountId) {
        const { data: existingAccount, error: accountError } = await supabase
          .from('accounts')
          .select('*')
          .eq('id', accountId)
          .maybeSingle();
          
        if (!accountError && existingAccount) {
          console.log("Found existing account:", existingAccount);
          
          // UPDATE: Check if this account already belongs to the current user
          // If it does, we don't want to update it to point to itself
          if (existingAccount.owner_id === user.id) {
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
            console.error("Error updating existing account:", updateError);
            // Continue to create a new account
          } else {
            console.log("Successfully updated existing account");
            
            // Remove the invitation from localStorage
            removePendingInvitation(invitationId);
            
            // Clear the sessionStorage
            sessionStorage.removeItem('pendingInvitationAccountId');
            
            toast.success('הצטרפת לחשבון בהצלחה!');
            
            // Return the updated account
            return {
              id: existingAccount.id,
              name: existingAccount.name,
              ownerId: existingAccount.owner_id,
              sharedWithId: user.id,
              sharedWithEmail: user.email,
              invitationId: invitationId,
              isSharedAccount: true // Mark this as a shared account for the current user
            };
          }
        } else {
          console.log("Account ID found but account not found in database:", accountId);
        }
      }
      
      // If we couldn't find or update an existing account, create a new one
      console.log("Creating new account from localStorage invitation data");
      
      const { data: newAccount, error: createError } = await supabase
        .from('accounts')
        .insert({
          name: localInvitation.name || 'חשבון משותף',
          owner_id: localInvitation.ownerId || user.id, // Use the original owner ID if available
          shared_with_id: user.id,
          shared_with_email: user.email,
          invitation_id: invitationId
        })
        .select('*')
        .single();
        
      if (createError) {
        console.error("Error creating new account:", createError);
        throw new Error('לא ניתן ליצור חשבון חדש, אנא צור קשר עם מנהל המערכת');
      }
      
      console.log("Created new account from localStorage invitation:", newAccount);
      
      // Remove the invitation from localStorage
      removePendingInvitation(invitationId);
      
      // Clear the sessionStorage
      sessionStorage.removeItem('pendingInvitationAccountId');
      
      toast.success('חשבון חדש נוצר בהצלחה!');
      
      return {
        id: newAccount.id,
        name: newAccount.name,
        ownerId: newAccount.owner_id,
        sharedWithId: user.id,
        sharedWithEmail: user.email,
        invitationId: invitationId,
        isSharedAccount: true // Mark this as a shared account for the current user
      };
    }
    
    // If we reach here, we found the invitation in the database
    const invitation = invitations[0];
    console.log("Found invitation in database:", invitation);
    
    // Get the account from the joined data
    const account = invitation.accounts;
    
    if (!account) {
      console.error("Account information not found in invitation");
      throw new Error('מידע החשבון לא נמצא בהזמנה');
    }
    
    // Validate that the invitation is for this user - Case insensitive email comparison
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      console.error(`Email mismatch: invitation for ${invitation.email} but user is ${user.email}`);
      throw new Error(`ההזמנה מיועדת ל-${invitation.email} אך אתה מחובר כ-${user.email}`);
    }
    
    // UPDATE: Check if this account already belongs to the current user
    // If it does, we don't want to update it to point to itself
    if (account.owner_id === user.id) {
      console.error("Cannot share account with yourself");
      throw new Error('לא ניתן לשתף חשבון עם עצמך');
    }
    
    // Update the account to add the shared user
    const { error: updateError } = await supabase
      .from('accounts')
      .update({ 
        shared_with_id: user.id,
        shared_with_email: user.email
      })
      .eq('id', account.id);
      
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
      throw acceptError;
    }
    
    // Create account object to return
    const sharedAccount: Account = {
      id: account.id,
      name: account.name,
      ownerId: account.owner_id,
      sharedWithId: user.id,
      sharedWithEmail: user.email,
      invitationId: invitationId,
      isSharedAccount: true // Mark this as a shared account for the current user
    };
    
    // Remove from localStorage
    removePendingInvitation(invitationId);
    
    console.log("Invitation acceptance completed successfully");
    toast.success('הצטרפת לחשבון בהצלחה!');
    return sharedAccount;
  } catch (error: any) {
    console.error('Failed to accept invitation:', error);
    toast.error(error.message || 'קבלת ההזמנה נכשלה, אנא נסה שוב');
    throw error;
  }
}
