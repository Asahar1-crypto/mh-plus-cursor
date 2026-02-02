import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';
import { User, Account } from '../../types';
import { toast } from 'sonner';

export async function sendInvitation(phoneNumber: string, user: User, account: Account): Promise<void> {
  try {
    console.log(`sendInvitation: User ${user.id} (${user.email}) sending invitation to phone ${phoneNumber} for account ${account.id}`);
    
    if (!phoneNumber || !user || !account) {
      console.error("sendInvitation: Missing required parameters", { phoneNumber, user: user?.id, account: account?.id });
      throw new Error('נתונים חסרים לשליחת ההזמנה');
    }

    // Verify the account exists and user is admin (member-based architecture)
    console.log(`sendInvitation: Verifying user ${user.id} is admin of account ${account.id}`);
    const { data: membershipData, error: membershipError } = await supabase
      .from('account_members')
      .select('role')
      .eq('account_id', account.id)
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
      
    if (membershipError || !membershipData) {
      console.error("sendInvitation: Admin verification failed", { membershipError, membershipData });
      throw new Error('רק מנהלי החשבון יכולים לשלוח הזמנות');
    }
    
    console.log("sendInvitation: Admin verification successful");

    // Check if there's already an active invitation for this phone and account
    console.log("sendInvitation: Checking for existing invitations");
    const { data: existingInvitation, error: existingError } = await supabase
      .from('invitations')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('account_id', account.id)
      .is('accepted_at', null)
      .gt('expires_at', 'now()');

    if (existingError) {
      console.error("sendInvitation: Error checking existing invitations:", existingError);
      throw new Error('שגיאה בבדיקת הזמנות קיימות: ' + existingError.message);
    }

    if (existingInvitation && existingInvitation.length > 0) {
      console.log("sendInvitation: Active invitation already exists");
      throw new Error('כבר נשלחה הזמנה פעילה למספר הטלפון הזה');
    }

    // Generate unique invitation ID
    const invitationId = uuidv4();
    console.log(`sendInvitation: Generated invitation ID: ${invitationId}`);

    // Create invitation record with phone_number instead of email
    console.log("sendInvitation: Creating invitation record");
    const { error: invitationError } = await supabase
      .from('invitations')
      .insert({
        account_id: account.id,
        phone_number: phoneNumber,
        email: null, // No email for SMS invitations
        invitation_id: invitationId,
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48 hours from now
      });

    if (invitationError) {
      console.error("sendInvitation: Error creating invitation:", invitationError);
      throw new Error('שגיאה ביצירת ההזמנה: ' + invitationError.message);
    }

    console.log("sendInvitation: Invitation created successfully");

    // Send SMS with invitation link
    try {
      const { data, error } = await supabase.functions.invoke('send-invitation-sms', {
        body: {
          phoneNumber: phoneNumber,
          invitationId: invitationId,
          accountName: account.name,
          inviterName: user.name || user.email,
          baseUrl: window.location.origin
        }
      });

      if (error) {
        console.warn("sendInvitation: SMS sending failed:", error);
        console.log("sendInvitation: Invitation created but SMS not sent. Link:", `${window.location.origin}/family-invitation?invitationId=${invitationId}`);
        toast.warning('ההזמנה נוצרה אך לא הצלחנו לשלוח SMS. אפשר לשתף את הלינק ידנית.');
      } else {
        console.log("sendInvitation: SMS sent successfully");
      }
    } catch (smsError) {
      console.warn("sendInvitation: SMS service error:", smsError);
      console.log("sendInvitation: Invitation created but SMS not sent.");
      toast.warning('ההזמנה נוצרה אך לא הצלחנו לשלוח SMS. אפשר לשתף את הלינק ידנית.');
    }

    console.log("sendInvitation: Invitation process completed successfully");
    
  } catch (error: any) {
    console.error('sendInvitation: Failed to send invitation:', error);
    throw error;
  }
}
