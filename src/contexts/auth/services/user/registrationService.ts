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
      
      // Sign up with Supabase - no email confirmation required (SMS verified)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            name, 
            phone_number: phoneNumber,
            phone_verified: !!phoneNumber // SMS כבר אומת
          }
        }
      });
      
      if (error) {
        console.error('Registration error:', error);
        throw error;
      }
      
      if (data?.user) {
        console.log('User created successfully with Supabase auth');
        
        // Update profile with verified phone number after registration
        if (phoneNumber) {
          try {
            // Wait a bit for the profile to be created by the trigger
            setTimeout(async () => {
              // First normalize the phone number
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
              
              // Update the profile with verified phone number
              const { error: profileUpdateError } = await supabase
                .from('profiles')
                .update({ 
                  phone_number: normalizedPhone,
                  phone_e164: normalizedPhone,
                  phone_verified: true,
                  raw_phone_input: phoneNumber
                })
                .eq('id', data.user!.id);

              if (profileUpdateError) {
                console.error('Error updating profile with phone:', profileUpdateError);
              } else {
                console.log('Profile updated with verified phone number');
              }
              
              // Also update the SMS verification code with the new user_id
              const { error: smsUpdateError } = await supabase
                .from('sms_verification_codes')
                .update({ user_id: data.user!.id })
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
            }, 1500); // Wait for profile trigger to complete
          } catch (updateError) {
            console.error('Error in phone update:', updateError);
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
        
        toast.success('נרשמת בהצלחה!');
        
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