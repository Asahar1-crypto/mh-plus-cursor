
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
      
      // Since we can only validate locally but need to create the account sharing in the database
      // Here we'd need to create the account sharing relation in the database
      throw new Error('לא ניתן לקבל הזמנה מקומית ללא נתונים בשרת, צור קשר עם מנהל המערכת');
    }
    
    // Explicitly cast the invitation to the proper type
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
      throw new Error('החשבון המשויך להזמנה לא נמצא');
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
