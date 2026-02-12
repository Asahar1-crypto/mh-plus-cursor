import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { User } from '../../types';

/**
 * Service for user registration
 * Uses Edge Function to bypass email confirmation (since SMS is already verified)
 */
export const registrationService = {
  register: async (name: string, email: string, password: string, phoneNumber?: string) => {
    try {
      
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
      
      // Register using Edge Function - bypasses email confirmation
      const { data: registerData, error: registerError } = await supabase.functions.invoke('register-user', {
        body: {
          email,
          password,
          name,
          phoneNumber,
          phoneVerified: !!phoneNumber
        }
      });
      
      if (registerError) {
        console.error('Registration error:', registerError);
        throw new Error(registerError.message || 'שגיאה ברישום');
      }
      
      if (!registerData?.success || !registerData?.user) {
        console.error('Registration failed:', registerData?.error);
        throw new Error(registerData?.error || 'שגיאה ברישום');
      }
      
      // Handle pending invitations
      if (invitations && invitations.length > 0) {
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
      }
      
      toast.success('נרשמת בהצלחה!');
      
      // Create user object
      const user: User = {
        id: registerData.user.id,
        email,
        name
      };
      
      return user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }
};