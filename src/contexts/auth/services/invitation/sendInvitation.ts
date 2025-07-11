
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';
import { User, Account } from '../../types';
import { toast } from 'sonner';

export async function sendInvitation(email: string, user: User, account: Account): Promise<void> {
  try {
    console.log(`sendInvitation: User ${user.id} (${user.email}) sending invitation to ${email} for account ${account.id}`);
    
    if (!email || !user || !account) {
      console.error("sendInvitation: Missing required parameters", { email, user: user?.id, account: account?.id });
      throw new Error('נתונים חסרים לשליחת ההזמנה');
    }

    // Verify the account exists and belongs to the user before sending invitation
    console.log(`sendInvitation: Verifying account ${account.id} exists and belongs to user ${user.id}`);
    const { data: accountExists, error: accountCheckError } = await supabase
      .from('accounts')
      .select('id, name, owner_id')
      .eq('id', account.id)
      .eq('owner_id', user.id)
      .single();
      
    if (accountCheckError || !accountExists) {
      console.error("sendInvitation: Account verification failed", { accountCheckError, accountExists });
      throw new Error('החשבון לא נמצא או שאינך הבעלים שלו');
    }
    
    console.log("sendInvitation: Account verified successfully:", accountExists);

    // Check if user is trying to invite themselves
    if (email.toLowerCase() === user.email.toLowerCase()) {
      console.error("sendInvitation: User trying to invite themselves");
      throw new Error('לא ניתן להזמין את עצמך');
    }

    // Check if there's already an active invitation for this email and account
    console.log("sendInvitation: Checking for existing invitations");
    const { data: existingInvitation, error: existingError } = await supabase
      .from('invitations')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('account_id', account.id)
      .is('accepted_at', null)
      .gt('expires_at', 'now()');

    if (existingError) {
      console.error("sendInvitation: Error checking existing invitations:", existingError);
      throw new Error('שגיאה בבדיקת הזמנות קיימות: ' + existingError.message);
    }

    if (existingInvitation && existingInvitation.length > 0) {
      console.log("sendInvitation: Active invitation already exists");
      throw new Error('כבר נשלחה הזמנה פעילה לכתובת האימייל הזו');
    }

    // Check if account is already shared with someone else
    if (account.sharedWithEmail && account.sharedWithEmail.toLowerCase() !== email.toLowerCase()) {
      console.error("sendInvitation: Account already shared with someone else");
      throw new Error(`החשבון כבר משותף עם ${account.sharedWithEmail}`);
    }

    // Generate unique invitation ID
    const invitationId = uuidv4();
    console.log(`sendInvitation: Generated invitation ID: ${invitationId}`);

    // Create invitation record
    console.log("sendInvitation: Creating invitation record");
    const { error: invitationError } = await supabase
      .from('invitations')
      .insert({
        account_id: account.id, // Make sure we use the verified account ID
        email: email.toLowerCase(),
        invitation_id: invitationId,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      });

    if (invitationError) {
      console.error("sendInvitation: Error creating invitation:", invitationError);
      throw new Error('שגיאה ביצירת ההזמנה: ' + invitationError.message);
    }

    console.log("sendInvitation: Invitation created successfully");

    // Try to send email (this might fail if email service is not configured)
    try {
      const invitationUrl = `${window.location.origin}/invitation/${invitationId}`;
      
      // Try to send email using the edge function
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          subject: 'הוזמנת לחשבון משותף - מחציות פלוס',
          html: `
            <div style="direction: rtl; text-align: right; font-family: Arial, sans-serif;">
              <h2>הוזמנת לחשבון משותף!</h2>
              <p>שלום,</p>
              <p>${user.name || user.email} הזמין/ה אותך להצטרף לחשבון "${account.name}" באפליקציית מחציות פלוס.</p>
              <p>כדי לקבל את ההזמנה, לחץ/י על הקישור הבא:</p>
              <a href="${invitationUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">קבל/י הזמנה</a>
              <p>אם הקישור לא עובד, העתק/י והדבק/י את הכתובת הבאה לדפדפן:</p>
              <p style="background-color: #f5f5f5; padding: 10px; border-radius: 3px; word-break: break-all;">${invitationUrl}</p>
              <p>ההזמנה תפוג תוך 7 ימים.</p>
              <p>בברכה,<br>צוות מחציות פלוס</p>
            </div>
          `
        }
      });

      if (error) {
        console.warn("sendInvitation: Email sending failed:", error);
        console.log("sendInvitation: Invitation created but email not sent. User can still accept via the app.");
      } else {
        console.log("sendInvitation: Email sent successfully");
      }
    } catch (emailError) {
      console.warn("sendInvitation: Email service error:", emailError);
      console.log("sendInvitation: Invitation created but email not sent. User can still accept via the app.");
    }

    console.log("sendInvitation: Invitation process completed successfully");
    
  } catch (error: any) {
    console.error('sendInvitation: Failed to send invitation:', error);
    throw error;
  }
}
