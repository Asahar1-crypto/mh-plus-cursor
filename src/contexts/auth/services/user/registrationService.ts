
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { User } from '../../types';

/**
 * Service for user registration
 */
export const registrationService = {
  register: async (name: string, email: string, password: string) => {
    try {
      console.log(`Registering user: ${name} (${email})`);
      
      // CRITICAL FIX: Improved invitation query to ensure complete data
      const { data: invitations, error: invitationsError } = await supabase
        .from('invitations')
        .select(`
          invitation_id, 
          account_id, 
          accounts:account_id(
            name, 
            owner_id
          )
        `)
        .eq('email', email)
        .is('accepted_at', null)
        .gt('expires_at', 'now()');
        
      if (invitationsError) {
        console.error("Error checking invitations:", invitationsError);
      }
      
      // Sign up with Supabase without auto-confirmation - we'll handle email via SendGrid
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            email_confirm: false // Prevent auto-email
          }
        }
      });
      
      if (error) {
        console.error('Registration error:', error);
        throw error;
      }
      
      if (data && data.user && !data.user.email_confirmed_at) {
        console.log('Registration successful:', data);
        
        // Send verification email via SendGrid immediately
        try {
          const verificationLink = `${window.location.origin}/verify-email?user_id=${data.user.id}&email=${encodeURIComponent(email)}`;
          
          console.log('Sending verification email via SendGrid to:', email);
          
          const emailResponse = await supabase.functions.invoke('send-email', {
            body: {
              to: email,
              subject: 'אימות חשבון - מחציות פלוס',
              html: `
                <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #333; margin-bottom: 10px;">ברוכים הבאים למחציות פלוס!</h1>
                    <p style="color: #666; font-size: 16px;">מערכת ניהול הוצאות משפחתיות</p>
                  </div>
                  
                  <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
                    <p style="margin: 0 0 15px 0; font-size: 16px;">שלום <strong>${name}</strong>,</p>
                    <p style="margin: 0; color: #666; line-height: 1.6;">
                      תודה על הרישום למערכת מחציות פלוס. כדי להשלים את הרישום ולאמת את כתובת האימייל שלך, אנא לחץ על הכפתור הבא:
                    </p>
                  </div>
                  
                  <div style="text-align: center; margin: 35px 0;">
                    <a href="${verificationLink}" 
                       style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                              color: white; 
                              padding: 15px 40px; 
                              text-decoration: none; 
                              border-radius: 8px; 
                              display: inline-block; 
                              font-weight: bold;
                              font-size: 16px;
                              box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                      ✅ אמת את החשבון שלך
                    </a>
                  </div>
                  
                  <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 25px 0;">
                    <p style="margin: 0; color: #856404; font-size: 14px;">
                      <strong>הקישור לא עובד?</strong><br>
                      העתק והדבק את הכתובת הבאה בדפדפן:
                    </p>
                    <p style="word-break: break-all; background-color: #f5f5f5; padding: 8px; border-radius: 4px; margin: 10px 0 0 0; font-family: monospace; font-size: 12px;">
                      ${verificationLink}
                    </p>
                  </div>
                  
                  <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
                    <p style="color: #666; font-size: 14px; margin: 0 0 10px 0; text-align: center;">
                      אם לא ביקשת לפתוח חשבון, אנא התעלם מהודעה זו.
                    </p>
                    <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                      מחציות פלוס - מערכת ניהול הוצאות משפחתיות<br>
                      © 2025 כל הזכויות שמורות
                    </p>
                  </div>
                </div>
              `
            }
          });
          
          console.log('Verification email sent via SendGrid, response:', emailResponse);
        } catch (emailError) {
          console.error('Failed to send verification email via SendGrid:', emailError);
          // Continue with registration even if email fails
        }
        
        // Show successful registration message
        toast.success('ההרשמה הושלמה בהצלחה! בדוק את האימייל לאישור החשבון');
        
        // If there are pending invitations, store them for later use
        if (invitations && invitations.length > 0) {
          console.log(`Found ${invitations.length} pending invitations for ${email} during registration`);
          console.log('Invitations details:', invitations);
          
          // CRITICAL FIX: Save complete invitation data to localStorage
          const pendingInvitations = {
            email,
            invitations: invitations.map(inv => ({
              invitationId: inv.invitation_id,
              accountId: inv.account_id,
              accountName: inv.accounts?.name || 'חשבון משותף',
              ownerId: inv.accounts?.owner_id
            })),
            skipAccountCreation: true // Flag to prevent automatic account creation
          };
          
          console.log('Preparing to store pending invitations:', pendingInvitations);
          localStorage.setItem('pendingInvitationsAfterRegistration', JSON.stringify(pendingInvitations));
          
          console.log('User has pending invitations - will not create new account automatically');
          console.log('Stored pending invitations with complete data:', pendingInvitations);
          
          // Additional logging to verify that invitations are properly stored
          setTimeout(() => {
            const storedInvitations = JSON.parse(localStorage.getItem('pendingInvitationsAfterRegistration') || '{}');
            console.log('Verification of stored invitations after timeout:', storedInvitations);
          }, 100);
        } else {
          console.log(`No pending invitations found for ${email} during registration - will create personal account`);
        }
        
        // Create typed User object
        const user: User = {
          id: data.user?.id || '',
          email,
          name
        };
        
        return user;
      }
      
      throw new Error('Registration failed for unknown reasons');
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }
};
