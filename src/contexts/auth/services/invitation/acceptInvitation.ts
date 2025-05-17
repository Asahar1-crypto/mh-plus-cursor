
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
      .select('*')
      .eq('invitation_id', invitationId)
      .is('accepted_at', null)
      .gt('expires_at', 'now()');
      
    if (findError) {
      console.error("Error finding invitation:", findError);
      throw findError;
    }
    
    if (!invitations || invitations.length === 0) {
      console.error("Invitation not found or expired in database");
      
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
      
      // Case insensitive comparison for email
      if (localInvitation.sharedWithEmail && 
          localInvitation.sharedWithEmail.toLowerCase() !== user.email.toLowerCase()) {
        console.error(`Email mismatch: invitation for ${localInvitation.sharedWithEmail} but user is ${user.email}`);
        throw new Error(`ההזמנה מיועדת ל-${localInvitation.sharedWithEmail} אך אתה מחובר כ-${user.email}`);
      }
      
      console.log("Attempting to create account sharing from localStorage invitation data");
      
      // Create a new account record if it doesn't exist
      const { data: newAccount, error: createError } = await supabase
        .from('accounts')
        .insert({
          name: localInvitation.name || 'חשבון משותף',
          owner_id: user.id, // Use current user as owner since we don't have the original owner ID
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
      
      // Mark the invitation as accepted by removing it from localStorage
      removePendingInvitation(invitationId);
      
      toast.success('חשבון חדש נוצר בהצלחה!');
      
      return {
        id: newAccount.id,
        name: newAccount.name,
        ownerId: newAccount.owner_id,
        sharedWithId: user.id,
        sharedWithEmail: user.email,
        invitationId: invitationId
      };
    }
    
    // If we reach here, we found the invitation in the database
    const invitation = invitations[0] as unknown as InvitationRecord;
    console.log("Found invitation:", invitation);
    
    // Validate that the invitation is for this user - Case insensitive email comparison
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      console.error(`Email mismatch: invitation for ${invitation.email} but user is ${user.email}`);
      throw new Error(`ההזמנה מיועדת ל-${invitation.email} אך אתה מחובר כ-${user.email}`);
    }
    
    // Get the account details - Do not use .single() to prevent the error
    const { data: accountData, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', invitation.account_id);
      
    if (accountError) {
      console.error("Error finding account:", accountError);
      throw accountError;
    }
    
    if (!accountData || accountData.length === 0) {
      console.error("Account not found:", invitation.account_id);
      
      // Create a new account if the original one is not found
      console.log("Original account not found, creating a new account");
      const { data: newAccount, error: createError } = await supabase
        .from('accounts')
        .insert({
          name: 'חשבון משותף',
          owner_id: user.id,
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
      
      console.log("Created new account:", newAccount);
      
      // Mark the invitation as accepted
      const { error: acceptError } = await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('invitation_id', invitationId);
        
      if (acceptError) {
        console.error("Error marking invitation as accepted:", acceptError);
      }
      
      // Remove from localStorage
      removePendingInvitation(invitationId);
      
      toast.success('חשבון חדש נוצר בהצלחה!');
      
      return {
        id: newAccount.id,
        name: newAccount.name,
        ownerId: newAccount.owner_id,
        sharedWithId: user.id,
        sharedWithEmail: user.email,
        invitationId: invitationId
      };
    }
    
    // Explicitly cast the account data to the proper type
    const accountRecord = accountData[0] as unknown as AccountRecord;
    console.log("Found account:", accountRecord);
    
    // Update the account to add the shared user
    const { error: updateError } = await supabase
      .from('accounts')
      .update({ 
        shared_with_id: user.id,
        shared_with_email: user.email
      })
      .eq('id', invitation.account_id);
      
    if (updateError) {
      console.error("Error updating account:", updateError);
      throw updateError;
    }
    
    // Mark the invitation as accepted - using the correct column name - invitation_id
    const { error: acceptError } = await supabase
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('invitation_id', invitationId);
      
    if (acceptError) {
      console.error("Error marking invitation as accepted:", acceptError);
      throw acceptError;
    }
    
    // Create account object to return
    const account: Account = {
      id: accountRecord.id,
      name: accountRecord.name,
      ownerId: accountRecord.owner_id,
      sharedWithId: user.id,
      sharedWithEmail: user.email,
      invitationId: invitationId
    };
    
    // Remove from localStorage for the demo
    removePendingInvitation(invitationId);
    
    console.log("Invitation acceptance completed successfully");
    toast.success('הצטרפת לחשבון בהצלחה!');
    return account;
  } catch (error: any) {
    console.error('Failed to accept invitation:', error);
    toast.error(error.message || 'קבלת ההזמנה נכשלה, אנא נסה שוב');
    throw error;
  }
}
