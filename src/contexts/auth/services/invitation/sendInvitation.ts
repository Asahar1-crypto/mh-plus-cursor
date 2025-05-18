
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { User, Account } from '../../types';
import { sendInvitationEmail } from '@/utils/emailService';

/**
 * Sends an invitation to a user to join an account
 */
export async function sendInvitation(email: string, user: User, account: Account) {
  try {
    console.log(`User ${user.id} (${user.email}) sending invitation to ${email} for account ${account.id}`);
    
    // Check if an invitation already exists for this email and account
    const { data: existingInvitations, error: checkError } = await supabase
      .from('invitations')
      .select('*')
      .eq('email', email)
      .eq('account_id', account.id)
      .is('accepted_at', null);
      
    if (checkError) {
      console.error("Error checking existing invitations:", checkError);
      throw checkError;
    }
    
    // If invitation already exists, don't create a new one
    if (existingInvitations && existingInvitations.length > 0) {
      console.log(`Invitation already exists for ${email} and account ${account.id}`);
      toast.error('הזמנה כבר נשלחה למשתמש זה');
      throw new Error('Invitation already exists for this email');
    }
    
    // Generate a unique invitation ID
    const invitationId = uuidv4();
    
    console.log(`Creating new invitation with ID ${invitationId}`);
    
    // Create the invitation in Supabase
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .insert({
        email,
        account_id: account.id,
        invitation_id: invitationId
      })
      .select()
      .single();
      
    if (inviteError) {
      console.error("Error creating invitation:", inviteError);
      throw inviteError;
    }
    
    console.log('Invitation created successfully:', invitation);
    
    // Update the account with the invitation details
    const { data: updatedAccountData, error: updateError } = await supabase
      .from('accounts')
      .update({
        invitation_id: invitationId,
        shared_with_email: email
      })
      .eq('id', account.id)
      .select()
      .single();
      
    if (updateError) {
      console.error("Error updating account:", updateError);
      throw updateError;
    }
    
    console.log('Account updated with invitation details:', updatedAccountData);
    
    // Prepare invitation link and send email
    try {
      const baseUrl = window.location.origin;
      const invitationLink = `${baseUrl}/invitation/${invitationId}`;
      
      console.log(`Sending invitation email to ${email} with link ${invitationLink}`);
      
      await sendInvitationEmail(
        email,
        invitationLink,
        user.name || user.email,
        account.name
      );
      
      console.log(`Invitation email sent to ${email} with link ${invitationLink}`);
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // We don't throw here because the invitation was created successfully
      // The user can still access it via the app
      toast.warning('ההזמנה נוצרה אך שליחת האימייל נכשלה');
    }
    
    // Return the updated account object
    const updatedAccount = {
      ...account,
      invitationId,
      sharedWithEmail: email
    };
    
    console.log("Invitation process completed successfully");
    toast.success('ההזמנה נשלחה בהצלחה!');
    return updatedAccount;
  } catch (error) {
    console.error('Failed to send invitation:', error);
    toast.error('שליחת ההזמנה נכשלה, אנא נסה שוב');
    throw error;
  }
}
