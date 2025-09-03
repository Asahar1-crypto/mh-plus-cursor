import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { User } from '../../types';

/**
 * Service for user registration
 */
export const registrationService = {
  register: async (name: string, email: string, password: string, phoneNumber?: string) => {
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
      
      // Sign up with Supabase - use built-in email confirmation
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, phone_number: phoneNumber },
          emailRedirectTo: `${window.location.origin}/verify-email`
        }
      });
      
      if (error) {
        console.error('Registration error:', error);
        throw error;
      }
      
      if (data?.user) {
        console.log('User created successfully with Supabase auth');
        
        // Update SMS verification codes with user_id after registration
        if (phoneNumber) {
          try {
            // Wait a bit for the profile to be created by the trigger
            setTimeout(async () => {
              // First normalize the phone number to match what was stored in SMS codes
              const { parsePhoneNumber } = await import('libphonenumber-js');
              let normalizedPhone = phoneNumber;
              
              try {
                let cleaned = phoneNumber.trim()
                  .replace(/^\s*00/, '+')           
                  .replace(/[^\d+]/g, '');         

                if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
                  cleaned = '+972' + cleaned.substring(1);
                }
                
                if (cleaned.startsWith('972') && !cleaned.startsWith('+')) {
                  cleaned = '+' + cleaned;
                }

                const phoneNumberObj = parsePhoneNumber(cleaned, 'IL');
                if (phoneNumberObj && phoneNumberObj.isValid()) {
                  normalizedPhone = phoneNumberObj.number;
                }
              } catch (normalizeError) {
                console.error('Error normalizing phone for update:', normalizeError);
              }
              
              // Update the SMS verification code with the new user_id
              const { error: smsUpdateError } = await supabase
                .from('sms_verification_codes')
                .update({ user_id: data.user.id })
                .eq('phone_number', normalizedPhone)
                .eq('verification_type', 'registration')
                .is('user_id', null)
                .order('created_at', { ascending: false })
                .limit(1);

              if (smsUpdateError) {
                console.error('Error updating SMS verification with user_id:', smsUpdateError);
              } else {
                console.log('SMS verification code updated with user_id');
              }
            }, 1000);
          } catch (updateError) {
            console.error('Error in SMS update:', updateError);
          }
        }
        
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