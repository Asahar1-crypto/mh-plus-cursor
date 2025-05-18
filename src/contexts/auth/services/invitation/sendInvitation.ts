
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { User, Account } from '../../types';
import { sendInvitationEmail } from '@/utils/emailService';
import { CreateInvitationParams, CreateInvitationReturn } from './rpcTypes';

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
    
    // First check if the account already has a shared user
    if (account.sharedWithId || account.sharedWithEmail) {
      const errorMsg = 'חשבון זה כבר משותף עם משתמש אחר';
      console.error(errorMsg, { 
        currentSharedWithId: account.sharedWithId, 
        currentSharedWithEmail: account.sharedWithEmail 
      });
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
    
    // Transaction to ensure consistency between invitation and account update
    const params: CreateInvitationParams = {
      p_email: normalizedEmail,
      p_account_id: account.id,
      p_invitation_id: invitationId
    };
    
    const { data: transaction, error: transactionError } = await supabase
      .rpc<CreateInvitationReturn>('create_invitation_and_update_account', params);
      
    if (transactionError) {
      console.error("Transaction error:", transactionError);
      toast.error('שגיאה בשליחת ההזמנה, אנא נסה שוב');
      throw transactionError;
    }
    
    console.log('Invitation transaction completed successfully:', transaction);
    
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
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // We don't throw here because the invitation was created successfully in the database
      // The user can still access it via the app when they log in
      toast.warning('ההזמנה נוצרה בהצלחה אך שליחת האימייל נכשלה');
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
