
import { supabase } from '@/integrations/supabase/client';

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
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: options
    });
    
    if (error) {
      console.error('Error invoking send-email function:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Failed to send email:', error);
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
      <p>אם אתה לא מכיר את השולח, אתה יכול להתעלם מהודעה זו.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #718096; font-size: 14px;">מחציות פלוס - האפליקציה המובילה לניהול הוצאות משותפות</p>
    </div>
  `;
  
  return sendEmail({
    to: email,
    subject: `הזמנה להצטרף לחשבון משותף "${accountName}"`,
    html
  });
}
