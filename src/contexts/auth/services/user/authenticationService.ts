
import { supabase } from "@/integrations/supabase/client";
import { User } from '../../types';
import { toast } from 'sonner';

// Hebrew text constants to avoid JSX parsing issues
const LOGIN_SUCCESS_MESSAGE = 'התחברת בהצלחה!';
const INVALID_CREDENTIALS_MESSAGE = 'שם המשתמש או הסיסמה אינם נכונים';
const TOO_MANY_REQUESTS_MESSAGE = 'יותר מדי נסיונות התחברות, נסה שוב מאוחר יותר';
const GENERIC_LOGIN_ERROR_MESSAGE = 'ההתחברות נכשלה, אנא נסה שוב';
const LOGOUT_SUCCESS_MESSAGE = 'התנתקת בהצלחה';
const LOGOUT_ERROR_MESSAGE = 'ההתנתקות נכשלה, אנא נסה שוב';

/**
 * Service for authentication operations (login, logout)
 */
export const authenticationService = {
  // Login function
  login: async (email: string, password: string): Promise<User> => {
    try {
      
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

  // Logout function
  logout: async (): Promise<void> => {
    try {
      
      // Clear session storage and localStorage before signOut
      sessionStorage.clear();
      localStorage.removeItem('supabase.auth.token');
      
      const { error } = await supabase.auth.signOut({
        scope: 'global' // This ensures complete logout
      });
      
      if (error) {
        console.error("Logout error from Supabase:", error);
        // Even if there's an error, we want to clear local state
      }
      
      toast.info(LOGOUT_SUCCESS_MESSAGE);
    } catch (error) {
      console.error('Logout failed:', error);
      // Clear local storage even on error
      sessionStorage.clear();
      localStorage.removeItem('supabase.auth.token');
      toast.error(LOGOUT_ERROR_MESSAGE);
      // Don't throw error - we want to continue with local logout
    }
  },
};
