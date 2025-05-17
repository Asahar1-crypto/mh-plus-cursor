
import { supabase } from "@/integrations/supabase/client";
import { User, Account } from '../../types';
import { toast } from 'sonner';
import { sendInvitationEmail } from '@/utils/emailService';
import { PendingInvitationRecord } from './types';

/**
 * Sends an invitation to a user to join an account
 */
export async function sendInvitation(email: string, user: User, account: Account): Promise<Account> {
  try {
    console.log(`Attempting to send invitation from ${user.name} to ${email} for account ${account.name}`);
    
    // Check if the email already exists as a user
    const { data: existingUserData } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
      
    const existingUserId = existingUserData?.id;
    console.log(`Existing user check for ${email}:`, existingUserId ? `Found user ${existingUserId}` : "No existing user");
    
    // Check if there's already an invitation for this email
    const { data: existingInvitations, error: checkError } = await supabase
      .from('invitations')
      .select('*')
      .eq('account_id', account.id)
      .eq('email', email)
      .is('accepted_at', null)
      .gt('expires_at', 'now()');
      
    if (checkError) {
      console.error("Error checking existing invitations:", checkError);
      throw checkError;
    }
    
    console.log(`Found ${existingInvitations?.length || 0} existing invitations for ${email}`);
    
    let invitationId;
    
    if (existingInvitations && existingInvitations.length > 0) {
      // Use the existing invitation
      console.log(`Invitation already exists for ${email}, reusing: ${existingInvitations[0].invitation_id}`);
      invitationId = existingInvitations[0].invitation_id;
    } else {
      // Generate a unique invitation ID
      invitationId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      console.log(`Creating new invitation with ID ${invitationId}`);
      
      // Insert the invitation into Supabase
      const { error: insertError } = await supabase
        .from('invitations')
        .insert({
          account_id: account.id,
          email: email,
          invitation_id: invitationId
        });
        
      if (insertError) {
        console.error("Error inserting invitation:", insertError);
        throw insertError;
      }
    }
    
    // Build the invitation link
    const invitationLink = `${window.location.origin}/invitation/${invitationId}`;
    
    console.log(`Invitation link generated: ${invitationLink}`);
    
    // Send invitation email
    try {
      await sendInvitationEmail(
        email,
        invitationLink,
        user.name,
        account.name
      );
      
      console.log(`Invitation email sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      toast.error('ההזמנה נוצרה אך שליחת האימייל נכשלה');
      // We continue even if email fails, as the invitation was created
    }
    
    // Store in localStorage for the demo
    try {
      const pendingInvitations = JSON.parse(localStorage.getItem('pendingInvitations') || '{}') as Record<string, PendingInvitationRecord>;
      pendingInvitations[invitationId] = {
        name: account.name,
        ownerName: user.name,
        sharedWithEmail: email,
        invitationId: invitationId
      };
      localStorage.setItem('pendingInvitations', JSON.stringify(pendingInvitations));
      console.log("Updated localStorage with invitation information");
    } catch (storageError) {
      console.error("Error updating localStorage:", storageError);
    }
    
    // Update the account object
    const updatedAccount: Account = {
      ...account,
      sharedWithEmail: email,
      invitationId: invitationId
    };

    // Update the account in the database to reference this invitation
    try {
      const { error: updateError } = await supabase
        .from('accounts')
        .update({ 
          shared_with_email: email,
          invitation_id: invitationId
        })
        .eq('id', account.id);
        
      if (updateError) {
        console.error("Error updating account with invitation data:", updateError);
        toast.error('ההזמנה נוצרה אך עדכון פרטי החשבון נכשל');
      }
    } catch (dbError) {
      console.error("Exception during account update:", dbError);
    }
    
    console.log("Invitation process completed successfully");
    return updatedAccount;
  } catch (error) {
    console.error('Failed to send invitation:', error);
    toast.error('שליחת ההזמנה נכשלה, אנא נסה שוב');
    throw error;
  }
}
