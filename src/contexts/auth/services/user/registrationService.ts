
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
      
      // Check for pending invitations
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
      
      // Generate verification token
      const verificationToken = crypto.randomUUID();
      
      // Sign up with Supabase without email confirmation
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`,
          data: { name }
        }
      });
      
      if (error) {
        console.error('Registration error:', error);
        throw error;
      }
      
      if (data?.user) {
        console.log('User created, sending verification email via SendGrid');
        
        // Store verification token in database
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        const { error: tokenError } = await supabase
          .from('verification_tokens')
          .insert({
            user_id: data.user.id,
            email: email,
            token: verificationToken,
            expires_at: expiresAt.toISOString()
          });
          
        if (tokenError) {
          console.error('Failed to store verification token:', tokenError);
          throw new Error('Failed to create verification token');
        }
        
        // Send email via SendGrid
        const verificationUrl = `${window.location.origin}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
        
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: email,
            subject: 'אימות כתובת האימייל שלך',
            html: `
              <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
                <div style="background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                  <h1 style="color: #1f2937; text-align: center; margin-bottom: 30px;">ברוך הבא, ${name}!</h1>
                  <p style="color: #374151; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
                    תודה על הרישום למערכת. כדי להשלים את תהליך הרישום, אנא לחץ על הכפתור למטה לאימות כתובת האימייל שלך:
                  </p>
                  <div style="text-align: center; margin: 40px 0;">
                    <a href="${verificationUrl}" 
                       style="background-color: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                      אמת את האימייל שלך
                    </a>
                  </div>
                  <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
                    אם אינך יכול ללחוץ על הכפתור, העתק והדבק את הקישור הבא לדפדפן שלך:<br>
                    <a href="${verificationUrl}" style="color: #3b82f6; word-break: break-all;">${verificationUrl}</a>
                  </p>
                  <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                    קישור זה יפוג תוך 24 שעות. אם לא ביקשת רישום זה, אנא התעלם מהמייל הזה.
                  </p>
                </div>
              </div>
            `
          }
        });
        
        if (emailError) {
          console.error('Failed to send verification email:', emailError);
          throw new Error('Failed to send verification email');
        }
        
        console.log('Verification email sent successfully');
        
        // Handle pending invitations
        if (invitations && invitations.length > 0) {
          console.log(`Found ${invitations.length} pending invitations for ${email}`);
          const pendingInvitations = {
            email,
            invitations: invitations.map(inv => ({
              invitationId: inv.invitation_id,
              accountId: inv.account_id,
              accountName: inv.accounts?.name || 'חשבון משותף',
              ownerId: inv.accounts?.owner_id
            })),
            skipAccountCreation: true
          };
          
          localStorage.setItem('pendingInvitationsAfterRegistration', JSON.stringify(pendingInvitations));
          console.log('Stored pending invitations');
        }
        
        toast.success('נרשמת בהצלחה! בדוק את האימייל שלך לאישור החשבון');
        
        // Create user object
        const user: User = {
          id: data.user.id,
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
