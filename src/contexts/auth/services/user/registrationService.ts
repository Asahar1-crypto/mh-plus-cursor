
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
      
      // Generate unique verification token for custom email
      const verificationToken = crypto.randomUUID();
      
      // Sign up with Supabase without email confirmation (we'll handle it via SendGrid)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email?token=${verificationToken}`,
          data: {
            name,
            verification_token: verificationToken
          }
        }
      });
      
      if (error) {
        console.error('Registration error:', error);
        throw error;
      }
      
      if (data) {
        console.log('Registration successful:', data);
        
        // Send verification email via SendGrid
        try {
          const verificationLink = `${window.location.origin}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
          
          await supabase.functions.invoke('send-email', {
            body: {
              to: email,
              subject: 'אימות חשבון - מחציות פלוס',
              html: `
                <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h1 style="color: #333; text-align: center;">ברוכים הבאים למחציות פלוס!</h1>
                  <p>שלום ${name},</p>
                  <p>תודה על הרישום למערכת מחציות פלוס. כדי להשלים את הרישום ולאמת את כתובת האימייל שלך, אנא לחץ על הקישור הבא:</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationLink}" 
                       style="background-color: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                      אמת את החשבון שלך
                    </a>
                  </div>
                  <p>אם הקישור לא עובד, העתק והדבק את הכתובת הבאה בדפדפן:</p>
                  <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 3px;">
                    ${verificationLink}
                  </p>
                  <p style="color: #666; font-size: 14px; margin-top: 30px;">
                    אם לא ביקשת לפתוח חשבון, אנא התעלם מהודעה זו.
                  </p>
                  <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                  <p style="color: #999; font-size: 12px; text-align: center;">
                    מחציות פלוס - מערכת ניהול הוצאות משפחתיות
                  </p>
                </div>
              `
            }
          });
          
          console.log('Verification email sent via SendGrid');
        } catch (emailError) {
          console.error('Failed to send verification email:', emailError);
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
