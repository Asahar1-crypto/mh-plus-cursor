
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
      
      // Check if email has pending invitations
      const { data: invitations, error: invitationsError } = await supabase
        .from('invitations')
        .select('invitation_id, account_id')
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
            name
          }
        }
      });
      
      if (error) {
        console.error('Registration error:', error);
        throw error;
      }
      
      if (data) {
        console.log('Registration successful:', data);
        
        // Show successful registration message
        toast.success('ההרשמה הושלמה בהצלחה!');
        
        // If there are pending invitations, store them for later use
        if (invitations && invitations.length > 0) {
          console.log(`Found ${invitations.length} pending invitations for ${email} during registration`);
          
          // Save more complete invitation data to localStorage
          localStorage.setItem('pendingInvitationsAfterRegistration', JSON.stringify({
            email,
            invitations: invitations.map(inv => ({
              invitationId: inv.invitation_id,
              accountId: inv.account_id
            }))
          }));
          
          console.log('Stored pending invitations with account IDs:', invitations);
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
