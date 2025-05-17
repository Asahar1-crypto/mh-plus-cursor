
import { toast } from 'sonner';
import { User, Account } from './types';
import { supabase } from "@/integrations/supabase/client";

export const authService = {
  // Check for saved session
  checkAuth: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return { user: null, account: null };
      }
      
      // Create user object based on Supabase session
      const user: User = {
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User'
      };
      
      // For now, create a simulated account since we don't have actual Supabase tables yet
      const account: Account = {
        id: `account-${user.id}`,
        name: `משפחת ${user.name}`,
        ownerId: user.id
      };
      
      return { user, account };
    } catch (error) {
      console.error('Error checking authentication:', error);
      return { user: null, account: null };
    }
  },

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
      
      // Create a simulated account
      const account: Account = {
        id: `account-${user.id}`,
        name: `משפחת ${user.name}`,
        ownerId: user.id
      };
      
      toast.success('התחברת בהצלחה!');
      return { user, account };
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
    }
  },

  // Send invitation function - simplified version until we have tables
  sendInvitation: async (email: string, user: User, account: Account) => {
    try {
      // Generate a unique invitation ID
      const invitationId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // In a real implementation, this would update the database
      const updatedAccount: Account = {
        ...account,
        sharedWithEmail: email,
        invitationId: invitationId
      };
      
      console.log(`Email would be sent to ${email} with invitation link: /invitation/${invitationId}`);
      
      return updatedAccount;
    } catch (error) {
      console.error('Failed to send invitation:', error);
      toast.error('שליחת ההזמנה נכשלה, אנא נסה שוב');
      throw error;
    }
  },

  // Remove invitation function - simplified version until we have tables
  removeInvitation: async (account: Account) => {
    try {
      // In a real implementation, this would update the database
      const updatedAccount: Account = {
        ...account,
        sharedWithId: undefined,
        sharedWithEmail: undefined,
        invitationId: undefined
      };
      
      return updatedAccount;
    } catch (error) {
      console.error('Failed to remove invitation:', error);
      toast.error('הסרת השותף נכשלה, אנא נסה שוב');
      throw error;
    }
  },

  // Accept invitation function - simplified version until we have tables
  acceptInvitation: async (invitationId: string, user: User) => {
    try {
      // This is a simplified implementation until we have actual database tables
      // Create a simulated account for demonstration purposes
      const account: Account = {
        id: `shared-account-${Date.now()}`,
        name: `משפחה משותפת`,
        ownerId: `owner-${Date.now()}`,
        sharedWithId: user.id,
        invitationId: invitationId
      };
      
      toast.success('הצטרפת לחשבון בהצלחה!');
      return account;
    } catch (error: any) {
      console.error('Failed to accept invitation:', error);
      toast.error(error.message || 'קבלת ההזמנה נכשלה, אנא נסה שוב');
      throw error;
    }
  },

  // Verify email function
  verifyEmail: async (token: string) => {
    try {
      // For email verification, we'll use Supabase's built-in functionality
      // Note: This might need adjustments based on how exactly your email verification works
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
  }
};
