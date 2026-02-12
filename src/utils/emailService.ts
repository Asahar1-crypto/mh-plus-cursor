
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
}

/**
 * Send an email using the Supabase Edge Function
 * @param options Email options
 */
export async function sendEmail(options: SendEmailOptions) {
  try {
    
    // Make sure we have the required fields
    if (!options.to || !options.subject || (!options.text && !options.html)) {
      throw new Error('Missing required email fields');
    }
    
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: options
    });
    
    if (error) {
      console.error('emailService: Error invoking send-email function:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('emailService: Failed to send email:', error);
    // Don't show toast here - we'll handle notifications at the caller level
    throw error;
  }
}

/**
 * Send an invitation email to a new user
 * @param email Recipient email
 * @param invitationLink Link to accept the invitation
 * @param senderName Name of the person who sent the invitation
 * @param accountName Name of the shared account
 */
export async function sendInvitationEmail(
  email: string, 
  invitationLink: string, 
  senderName: string, 
  accountName: string
) {
  // Preparing invitation email
  
  if (!email || !invitationLink) {
    console.error('emailService: Missing required parameters for invitation email');
    throw new Error('Missing required parameters for invitation email');
  }
  
  // Basic HTML template for invitation
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl;">
      <h2 style="color: #4a5568;">הזמנה לחשבון משותף</h2>
      <p>שלום,</p>
      <p><strong>${senderName}</strong> הזמין אותך להצטרף לחשבון "${accountName}" במחציות פלוס.</p>
      <p>לחץ על הקישור למטה כדי לאשר את ההזמנה:</p>
      <p style="margin: 25px 0;">
        <a href="${invitationLink}" style="background-color: #3182ce; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">אישור הזמנה</a>
      </p>
      <p>אם אין לך חשבון במערכת, תוכל/י להירשם ואז לקבל את ההזמנה.</p>
      <p>אם אתה לא מכיר את השולח, אתה יכול להתעלם מהודעה זו.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #718096; font-size: 14px;">מחציות פלוס - האפליקציה המובילה לניהול הוצאות משותפות</p>
    </div>
  `;
  
  // Send invitation email
  
  try {
    const result = await sendEmail({
      to: email,
      subject: `הזמנה להצטרף לחשבון משותף "${accountName}"`,
      html
    });
    
    if (result && result.warning) {
      toast.warning('ההזמנה נוצרה אך שליחת האימייל נכשלה. המשתמש יוכל לראות את ההזמנה בכניסה למערכת.');
    } else {
      toast.success(`הזמנה נשלחה ל-${email} בהצלחה!`);
    }
    
    return result;
  } catch (error) {
    console.error(`emailService: Failed to send invitation email to ${email}:`, error);
    
    // Instead of showing an error, show a warning that email failed but invitation was created
    toast.warning('ההזמנה נוצרה בהצלחה אך שליחת האימייל נכשלה. המשתמש יוכל לראות את ההזמנה בכניסה למערכת.');
    
    // We don't re-throw the error because we want the invitation process to continue
    // even if email sending fails
    return { warning: 'Email sending failed but invitation created' };
  }
}

/**
 * Send a test email to verify the email sending functionality
 * @param email Recipient email
 */
export async function sendTestEmail(email: string) {
  // Sending test email
  
  // Test email HTML template
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl;">
      <h2 style="color: #4a5568;">בדיקת מערכת שליחת אימיילים</h2>
      <p>שלום,</p>
      <p>זהו אימייל בדיקה ממערכת מחציות פלוס.</p>
      <p>אם קיבלת אימייל זה, מערכת שליחת האימיילים פועלת כראוי.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #718096; font-size: 14px;">מחציות פלוס - האפליקציה המובילה לניהול הוצאות משותפות</p>
    </div>
  `;
  
  try {
    const result = await sendEmail({
      to: email,
      subject: `בדיקת מערכת - מחציות פלוס`,
      html
    });
    
    if (result && result.warning) {
      toast.warning('שליחת אימייל הבדיקה נכשלה.');
      return { success: false, message: 'שליחת אימייל הבדיקה נכשלה.' };
    } else {
      toast.success(`אימייל בדיקה נשלח ל-${email} בהצלחה!`);
      return { success: true, message: `אימייל בדיקה נשלח ל-${email} בהצלחה!` };
    }
  } catch (error) {
    console.error(`emailService: Failed to send test email to ${email}:`, error);
    toast.error('שליחת אימייל הבדיקה נכשלה.');
    return { success: false, message: 'שליחת אימייל הבדיקה נכשלה.' };
  }
}
