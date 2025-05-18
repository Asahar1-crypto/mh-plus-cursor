
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { User, Account } from '../../types';
import { sendInvitationEmail } from '@/utils/emailService';
import { SendInvitationParams, SendInvitationResult } from './rpcTypes';

/**
 * Sends an invitation to a user to join an account
 */
export async function sendInvitation(email: string, user: User, account: Account) {
  try {
    // Normalize email to lowercase for consistent comparison
    const normalizedEmail = email.toLowerCase();
    
    console.log(`User ${user.id} (${user.email}) sending invitation to ${normalizedEmail} for account ${account.id}`);
    
    if (!normalizedEmail || !user || !account) {
      const errorMsg = 'חסרים פרטים הכרחיים לשליחת הזמנה';
      console.error(errorMsg, { email: normalizedEmail, userId: user?.id, accountId: account?.id });
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    // Email validation
    if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
      const errorMsg = 'כתובת דוא״ל לא תקינה';
      console.error(errorMsg, { email: normalizedEmail });
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    // Check if the email is the same as the current user (case-insensitive)
    if (normalizedEmail === user.email.toLowerCase()) {
      const errorMsg = 'לא ניתן לשלוח הזמנה לעצמך';
      console.error(errorMsg);
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    // Check if the account already has a partner
    if (account.sharedWithId || account.sharedWithEmail) {
      const errorMsg = 'חשבון זה כבר משותף עם משתמש אחר';
      console.error(errorMsg, { sharedWithId: account.sharedWithId, sharedWithEmail: account.sharedWithEmail });
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    // Check if an invitation already exists for this email and account
    const { data: existingInvitations, error: checkError } = await supabase
      .from('invitations')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('account_id', account.id)
      .is('accepted_at', null);
      
    if (checkError) {
      console.error("Error checking existing invitations:", checkError);
      throw checkError;
    }
    
    // If invitation already exists, don't create a new one
    if (existingInvitations && existingInvitations.length > 0) {
      console.log(`Invitation already exists for ${normalizedEmail} and account ${account.id}`);
      toast.error('הזמנה כבר נשלחה למשתמש זה');
      throw new Error('Invitation already exists for this email');
    }
    
    // Generate a unique invitation ID
    const invitationId = uuidv4();
    
    console.log(`Creating new invitation with ID ${invitationId}`);
    
    // Start a transaction
    try {
      // Create the invitation in Supabase
      const { data: invitation, error: inviteError } = await supabase
        .from('invitations')
        .insert({
          email: normalizedEmail,
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
          shared_with_email: normalizedEmail
        })
        .eq('id', account.id)
        .select()
        .single();
        
      if (updateError) {
        console.error("Error updating account:", updateError);
        
        // Clean up the invitation if account update fails
        await supabase
          .from('invitations')
          .delete()
          .eq('invitation_id', invitationId);
          
        throw updateError;
      }
      
      console.log('Account updated with invitation details:', updatedAccountData);
      
      // Prepare invitation link and send email
      try {
        const baseUrl = window.location.origin;
        const invitationLink = `${baseUrl}/invitation/${invitationId}`;
        
        console.log(`Sending invitation email to ${normalizedEmail} with link ${invitationLink}`);
        
        await sendInvitationEmail(
          normalizedEmail,
          invitationLink,
          user.name || user.email,
          account.name || 'Shared Account'
        );
        
        console.log(`Invitation email sent to ${normalizedEmail} with link ${invitationLink}`);
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        // We don't throw here because the invitation was created successfully in the database
        // The user can still access it via the app when they log in
        toast.warning('ההזמנה נוצרה בהצלחה אך שליחת האימייל נכשלה');
      }
      
      // Return the updated account object
      const updatedAccount: Account = {
        ...account,
        invitationId,
        sharedWithEmail: normalizedEmail
      };
      
      console.log("Invitation process completed successfully");
      toast.success('ההזמנה נשלחה בהצלחה!');
      return updatedAccount;
      
    } catch (innerError) {
      console.error("Error in invitation transaction:", innerError);
      throw innerError;
    }
  } catch (error: any) {
    console.error('Failed to send invitation:', error);
    
    // Don't show toast error for cases where we already displayed specific error messages
    if (!error.message?.includes('Invitation already exists') && 
        !error.message?.includes('לא ניתן לשלוח הזמנה לעצמך') && 
        !error.message?.includes('כתובת דוא״ל לא תקינה') &&
        !error.message?.includes('חשבון זה כבר משותף עם משתמש אחר')) {
      toast.error('שליחת ההזמנה נכשלה, אנא נסה שוב');
    }
    
    throw error;
  }
}
