
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
      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        throw error;
      }
      
      if (!data.session) {
        throw new Error('No session returned after login');
      }
      
      // Create user object
      const user: User = {
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User'
      };
      
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
        throw error;
      }

      toast.success('הרשמה בוצעה בהצלחה! אנא אמת את כתובת האימייל שלך.');
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
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
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
      // For email verification, we'll use Supabase's built-in functionality
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email'
      });
      
      if (error) {
        throw error;
      }
      
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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password'
      });
      
      if (error) {
        throw error;
      }
      
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
      const { data: invitations, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('email', email)
        .is('accepted_at', null)
        .gt('expires_at', 'now()');
        
      if (error) throw error;

      return invitations || [];
    } catch (error) {
      console.error('Failed to check pending invitations:', error);
      return [];
    }
  }
};
