
import { supabase } from "@/integrations/supabase/client";
import { User, Account } from '../types';
import { toast } from 'sonner';

/**
 * Service for user-related operations (login, register, etc.)
 */
export const userService = {
  // Login function
  login: async (email: string, password: string) => {
    try {
      console.log(`Attempting login for ${email}`);
      
      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error("Login error from Supabase:", error);
        throw error;
      }
      
      if (!data.session) {
        console.error("No session returned after login");
        throw new Error('No session returned after login');
      }
      
      // Create user object
      const user: User = {
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User'
      };
      
      console.log("Login successful:", user);
      toast.success('התחברת בהצלחה!');
      return user;
    } catch (error: any) {
      console.error('Login failed:', error);
      
      // Handle specific error codes
      if (error.message?.includes('Invalid login credentials')) {
        toast.error('שם המשתמש או הסיסמה אינם נכונים');
      } else if (error.message?.includes('Too many requests')) {
        toast.error('יותר מדי נסיונות התחברות, נסה שוב מאוחר יותר');
      } else {
        toast.error('ההתחברות נכשלה, אנא נסה שוב');
      }
      
      throw error;
    }
  },

  // Register function
  register: async (name: string, email: string, password: string) => {
    try {
      console.log(`Attempting registration for ${email} with name ${name}`);
      
      // Register with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name
          }
        }
      });
      
      if (error) {
        console.error("Registration error from Supabase:", error);
        throw error;
      }

      console.log("Registration successful, checking for pending invitations");

      // Check for pending invitations for this email
      const { data: invitations, error: invitationError } = await supabase
        .from('invitations')
        .select('*')
        .eq('email', email)
        .is('accepted_at', null)
        .gt('expires_at', 'now()');
        
      if (invitationError) {
        console.error('Error checking invitations:', invitationError);
      }

      // If there are pending invitations, store them for processing after email verification
      if (invitations && invitations.length > 0) {
        console.log(`Found ${invitations.length} pending invitations for ${email}`);
        
        // Get any existing data
        const existingData = localStorage.getItem('pendingInvitationsAfterRegistration');
        let existingParsed = { email, invitations: [] };
        
        if (existingData) {
          try {
            existingParsed = JSON.parse(existingData);
          } catch (e) {
            console.error("Error parsing existing pendingInvitationsAfterRegistration:", e);
          }
        }
        
        // Store the invitations in localStorage so we can access them after verification
        localStorage.setItem('pendingInvitationsAfterRegistration', JSON.stringify({
          email,
          invitations: [
            ...existingParsed.invitations,
            ...invitations.map(inv => ({
              id: inv.id,
              accountId: inv.account_id,
              email: inv.email,
              invitationId: inv.invitation_id
            }))
          ]
        }));
        
        console.log("Stored pending invitations for processing after email verification");
      } else {
        console.log(`No pending invitations found for ${email}`);
      }

      toast.success('הרשמה בוצעה בהצלחה! אנא אמת את כתובת האימייל שלך.');
      return data;
    } catch (error: any) {
      console.error('Registration failed:', error);
      
      // Handle specific error codes
      if (error.message?.includes('already registered')) {
        toast.error('כתובת האימייל כבר רשומה במערכת');
      } else {
        toast.error('ההרשמה נכשלה, אנא נסה שוב');
      }
      
      throw error;
    }
  },

  // Logout function
  logout: async () => {
    try {
      console.log("Attempting logout");
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Logout error from Supabase:", error);
        throw error;
      }
      
      console.log("Logout successful");
      toast.info('התנתקת בהצלחה');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('ההתנתקות נכשלה, אנא נסה שוב');
      throw error;
    }
  },

  // Verify email function
  verifyEmail: async (token: string) => {
    try {
      console.log("Attempting to verify email with token");
      
      // For email verification, we'll use Supabase's built-in functionality
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email'
      });
      
      if (error) {
        console.error("Email verification error from Supabase:", error);
        throw error;
      }
      
      console.log("Email verification successful");
      toast.success('האימייל אומת בהצלחה!');
      return true;
    } catch (error) {
      console.error('Failed to verify email:', error);
      toast.error('אימות האימייל נכשל, אנא נסה שוב');
      return false;
    }
  },

  // Reset password function
  resetPassword: async (email: string) => {
    try {
      console.log(`Attempting password reset for ${email}`);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password'
      });
      
      if (error) {
        console.error("Password reset error from Supabase:", error);
        throw error;
      }
      
      console.log("Password reset email sent");
      toast.success('הוראות לאיפוס סיסמה נשלחו לאימייל שלך');
    } catch (error) {
      console.error('Failed to reset password:', error);
      toast.error('איפוס הסיסמה נכשל, אנא נסה שוב');
      throw error;
    }
  },

  // Check for pending invitations for a user
  checkPendingInvitations: async (email: string) => {
    try {
      console.log(`Checking pending invitations for ${email}`);
      
      const { data: invitations, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('email', email)
        .is('accepted_at', null)
        .gt('expires_at', 'now()');
        
      if (error) {
        console.error("Error checking pending invitations:", error);
        throw error;
      }

      console.log(`Found ${invitations?.length || 0} pending invitations for ${email}`);
      return invitations || [];
    } catch (error) {
      console.error('Failed to check pending invitations:', error);
      return [];
    }
  }
};
