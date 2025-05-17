import { supabase } from "@/integrations/supabase/client";
import { User, Account } from '../types';
import { toast } from 'sonner';

// Hebrew text constants to avoid JSX parsing issues
const LOGIN_SUCCESS_MESSAGE = 'התחברת בהצלחה!';
const INVALID_CREDENTIALS_MESSAGE = 'שם המשתמש או הסיסמה אינם נכונים';
const TOO_MANY_REQUESTS_MESSAGE = 'יותר מדי נסיונות התחברות, נסה שוב מאוחר יותר';
const GENERIC_LOGIN_ERROR_MESSAGE = 'ההתחברות נכשלה, אנא נסה שוב';
const REGISTRATION_SUCCESS_MESSAGE = 'הרשמה בוצעה בהצלחה! אנא אמת את כתובת האימייל שלך.';
const EMAIL_ALREADY_REGISTERED_MESSAGE = 'כתובת האימייל כבר רשומה במערכת';
const GENERIC_REGISTRATION_ERROR_MESSAGE = 'ההרשמה נכשלה, אנא נסה שוב';
const LOGOUT_SUCCESS_MESSAGE = 'התנתקת בהצלחה';
const LOGOUT_ERROR_MESSAGE = 'ההתנתקות נכשלה, אנא נסה שוב';
const EMAIL_VERIFICATION_SUCCESS_MESSAGE = 'האימייל אומת בהצלחה!';
const EMAIL_VERIFICATION_ERROR_MESSAGE = 'אימות האימייל נכשל, אנא נסה שוב';
const PASSWORD_RESET_SUCCESS_MESSAGE = 'הוראות לאיפוס סיסמה נשלחו לאימייל שלך';
const PASSWORD_RESET_ERROR_MESSAGE = 'איפוס הסיסמה נכשל, אנא נסה שוב';

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
      toast.success(LOGIN_SUCCESS_MESSAGE);
      return user;
    } catch (error: any) {
      console.error('Login failed:', error);
      
      // Handle specific error codes
      if (error.message?.includes('Invalid login credentials')) {
        toast.error(INVALID_CREDENTIALS_MESSAGE);
      } else if (error.message?.includes('Too many requests')) {
        toast.error(TOO_MANY_REQUESTS_MESSAGE);
      } else {
        toast.error(GENERIC_LOGIN_ERROR_MESSAGE);
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
        .select('*, accounts(*), accounts:accounts(owner_id, profiles:profiles(name))')
        .eq('email', email)
        .is('accepted_at', null)
        .gt('expires_at', 'now()');
        
      if (invitationError) {
        console.error('Error checking invitations:', invitationError);
      }

      // If there are pending invitations, store them for processing after email verification
      if (invitations && invitations.length > 0) {
        console.log(`Found ${invitations.length} pending invitations for ${email}:`, invitations);
        
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
              invitationId: inv.invitation_id,
              accountName: inv.accounts?.name || 'חשבון משותף',
              ownerName: inv.accounts?.profiles?.name || 'בעל החשבון'
            }))
          ]
        }));
        
        console.log("Stored pending invitations for processing after email verification");
      } else {
        console.log(`No pending invitations found for ${email}`);
      }

      toast.success(REGISTRATION_SUCCESS_MESSAGE);
      return data;
    } catch (error: any) {
      console.error('Registration failed:', error);
      
      // Handle specific error codes
      if (error.message?.includes('already registered')) {
        toast.error(EMAIL_ALREADY_REGISTERED_MESSAGE);
      } else {
        toast.error(GENERIC_REGISTRATION_ERROR_MESSAGE);
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
      toast.info(LOGOUT_SUCCESS_MESSAGE);
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error(LOGOUT_ERROR_MESSAGE);
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
      toast.success(EMAIL_VERIFICATION_SUCCESS_MESSAGE);
      return true;
    } catch (error) {
      console.error('Failed to verify email:', error);
      toast.error(EMAIL_VERIFICATION_ERROR_MESSAGE);
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
      toast.success(PASSWORD_RESET_SUCCESS_MESSAGE);
    } catch (error) {
      console.error('Failed to reset password:', error);
      toast.error(PASSWORD_RESET_ERROR_MESSAGE);
      throw error;
    }
  },

  // Check for pending invitations for a user
  checkPendingInvitations: async (email: string) => {
    try {
      console.log(`Checking pending invitations for ${email}`);
      
      const { data: invitations, error } = await supabase
        .from('invitations')
        .select('*, accounts(*), owner_profile:profiles!accounts(name)')
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
