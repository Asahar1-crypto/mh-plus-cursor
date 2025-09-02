
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { User } from '../../types';

/**
 * Service for user registration
 */
export const registrationService = {
  register: async (name: string, email: string, password: string, verificationMethod: string = 'email', phoneNumber?: string) => {
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
      
      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            name,
            verification_method: verificationMethod,
            phone_number: phoneNumber
          },
          emailRedirectTo: verificationMethod === 'email' 
            ? `${window.location.origin}/verify-email`
            : undefined
        }
      });
      
      if (error) {
        console.error('Registration error:', error);
        throw error;
      }
      
      if (data?.user) {
        console.log('User created successfully with Supabase auth');
        
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
        
        // Send SMS verification if selected
        if (verificationMethod === 'sms' && phoneNumber) {
          try {
            const { error: smsError } = await supabase.functions.invoke('send-sms', {
              body: {
                phone_number: phoneNumber,
                purpose: 'verification'
              }
            });
            
            if (smsError) {
              console.error('SMS sending error:', smsError);
              toast.error('שגיאה בשליחת SMS');
            } else {
              toast.success('נרשמת בהצלחה! קוד אימות נשלח למספר הטלפון שלך');
            }
          } catch (smsError) {
            console.error('SMS error:', smsError);
            toast.error('שגיאה בשליחת SMS');
          }
        } else {
          toast.success('נרשמת בהצלחה! בדוק את האימייל שלך לאישור החשבון');
        }
        
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
