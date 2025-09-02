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
          emailRedirectTo: `${window.location.origin}/#/verify-email`
        }
      });
      
      if (error) {
        console.error('Registration error:', error);
        throw error;
      }
      
      if (data?.user) {
        console.log('User created successfully with Supabase auth');
        
        // Update profile with phone number after successful registration
        if (phoneNumber) {
          try {
            // Wait a bit for the profile to be created by the trigger
            setTimeout(async () => {
              const { error: profileError } = await supabase
                .from('profiles')
                .update({ 
                  phone_number: phoneNumber,
                  phone_verified: true 
                })
                .eq('id', data.user.id);

              if (profileError) {
                console.error('Error updating profile with phone:', profileError);
              } else {
                console.log('Profile updated with phone number');
              }
            }, 1000);
          } catch (updateError) {
            console.error('Error in profile update:', updateError);
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