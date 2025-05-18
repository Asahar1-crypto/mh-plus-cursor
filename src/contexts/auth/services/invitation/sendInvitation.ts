
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
        account.name
      );
      
      console.log(`Invitation email sent to ${normalizedEmail} with link ${invitationLink}`);
      
      // Store invitation in localStorage for client-side access
      try {
        // Load existing invitations
        let pendingInvitations = {};
        const existingData = localStorage.getItem('pendingInvitations');
        
        if (existingData) {
          pendingInvitations = JSON.parse(existingData);
        }
        
        // Add new invitation
        pendingInvitations[invitationId] = {
          accountId: account.id,
          ownerId: user.id,
          ownerName: user.name || user.email,
          name: account.name,
          sharedWithEmail: normalizedEmail,
          createdAt: new Date().toISOString()
        };
        
        // Save back to localStorage
        localStorage.setItem('pendingInvitations', JSON.stringify(pendingInvitations));
        console.log(`Invitation stored in localStorage for ID ${invitationId}`);
      } catch (storageError) {
        console.error('Failed to store invitation in localStorage:', storageError);
        // Non-critical error, continue execution
      }
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
      sharedWithEmail: normalizedEmail
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
