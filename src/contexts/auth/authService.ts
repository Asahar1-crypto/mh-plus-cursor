
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
      
      // Get the user profile from the profile table
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      // Get account associated with this user
      const { data: accountData } = await supabase
        .from('accounts')
        .select('*')
        .or(`ownerId.eq.${session.user.id},sharedWithId.eq.${session.user.id}`)
        .single();
        
      // Create user object based on Supabase session and profile data
      const user: User = {
        id: session.user.id,
        email: session.user.email || '',
        name: profile?.name || session.user.email?.split('@')[0] || 'User'
      };
      
      // Create account object based on account data
      let account: Account | null = null;
      if (accountData) {
        account = {
          id: accountData.id,
          name: accountData.name,
          ownerId: accountData.owner_id,
          sharedWithId: accountData.shared_with_id,
          sharedWithEmail: accountData.shared_with_email,
          invitationId: accountData.invitation_id
        };
      }
      
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
      
      // Get the user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      // Get account associated with this user
      const { data: accountData } = await supabase
        .from('accounts')
        .select('*')
        .or(`owner_id.eq.${data.user.id},shared_with_id.eq.${data.user.id}`)
        .single();
      
      // Create user object
      const user: User = {
        id: data.user.id,
        email: data.user.email || '',
        name: profile?.name || data.user.email?.split('@')[0] || 'User'
      };
      
      // Create account object
      let account: Account | null = null;
      if (accountData) {
        account = {
          id: accountData.id,
          name: accountData.name,
          ownerId: accountData.owner_id,
          sharedWithId: accountData.shared_with_id,
          sharedWithEmail: accountData.shared_with_email,
          invitationId: accountData.invitation_id
        };
      } else {
        // Create a new account for this user if none exists
        const { data: newAccount, error: accountError } = await supabase
          .from('accounts')
          .insert({
            name: 'משפחת ' + user.name,
            owner_id: user.id
          })
          .select('*')
          .single();
        
        if (accountError) {
          console.error('Error creating account:', accountError);
        }
        
        if (newAccount) {
          account = {
            id: newAccount.id,
            name: newAccount.name,
            ownerId: newAccount.owner_id,
            sharedWithId: newAccount.shared_with_id,
            sharedWithEmail: newAccount.shared_with_email,
            invitationId: newAccount.invitation_id
          };
        }
      }
      
      toast.success('התחברת בהצלחה!');
      return { user, account };
    } catch (error: any) {
      console.error('Login failed:', error);
      
      // Handle specific error codes
      if (error.code === 'auth/invalid-email' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        toast.error('שם המשתמש או הסיסמה אינם נכונים');
      } else if (error.code === 'auth/too-many-requests') {
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
      
      // Create a profile for the user
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            name: name
          });
        
        if (profileError) {
          console.error('Error creating profile:', profileError);
        }
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

  // Send invitation function
  sendInvitation: async (email: string, user: User, account: Account) => {
    try {
      // Generate a unique invitation ID
      const invitationId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Update the account with the invited email
      const { data: updatedAccount, error } = await supabase
        .from('accounts')
        .update({
          shared_with_email: email,
          invitation_id: invitationId
        })
        .eq('id', account.id)
        .select('*')
        .single();
      
      if (error) {
        throw error;
      }
      
      if (!updatedAccount) {
        throw new Error('Failed to update account');
      }
      
      // In a real app, send an email to the invited user with a link to accept the invitation
      console.log(`Email would be sent to ${email} with invitation link: /invitation/${invitationId}`);
      
      return {
        id: updatedAccount.id,
        name: updatedAccount.name,
        ownerId: updatedAccount.owner_id,
        sharedWithId: updatedAccount.shared_with_id,
        sharedWithEmail: updatedAccount.shared_with_email,
        invitationId: updatedAccount.invitation_id
      } as Account;
    } catch (error) {
      console.error('Failed to send invitation:', error);
      toast.error('שליחת ההזמנה נכשלה, אנא נסה שוב');
      throw error;
    }
  },

  // Remove invitation function
  removeInvitation: async (account: Account) => {
    try {
      // Update the account to remove the shared user
      const { data: updatedAccount, error } = await supabase
        .from('accounts')
        .update({
          shared_with_id: null,
          shared_with_email: null,
          invitation_id: null
        })
        .eq('id', account.id)
        .select('*')
        .single();
      
      if (error) {
        throw error;
      }
      
      if (!updatedAccount) {
        throw new Error('Failed to update account');
      }
      
      return {
        id: updatedAccount.id,
        name: updatedAccount.name,
        ownerId: updatedAccount.owner_id,
        sharedWithId: updatedAccount.shared_with_id,
        sharedWithEmail: updatedAccount.shared_with_email,
        invitationId: updatedAccount.invitation_id
      } as Account;
    } catch (error) {
      console.error('Failed to remove invitation:', error);
      toast.error('הסרת השותף נכשלה, אנא נסה שוב');
      throw error;
    }
  },

  // Accept invitation function
  acceptInvitation: async (invitationId: string, user: User) => {
    try {
      // Find the invitation by ID
      const { data: invitation, error: invitationError } = await supabase
        .from('accounts')
        .select('*')
        .eq('invitation_id', invitationId)
        .single();
      
      if (invitationError || !invitation) {
        throw new Error('ההזמנה אינה קיימת או שפג תוקפה');
      }
      
      if (invitation.shared_with_email !== user.email) {
        throw new Error('ההזמנה אינה מיועדת לחשבון זה');
      }
      
      // Update the invitation with the user's ID
      const { data: updatedAccount, error } = await supabase
        .from('accounts')
        .update({
          shared_with_id: user.id
        })
        .eq('id', invitation.id)
        .select('*')
        .single();
      
      if (error) {
        throw error;
      }
      
      if (!updatedAccount) {
        throw new Error('Failed to update account');
      }
      
      toast.success('הצטרפת לחשבון בהצלחה!');
      
      return {
        id: updatedAccount.id,
        name: updatedAccount.name,
        ownerId: updatedAccount.owner_id,
        sharedWithId: updatedAccount.shared_with_id,
        sharedWithEmail: updatedAccount.shared_with_email,
        invitationId: updatedAccount.invitation_id
      } as Account;
    } catch (error: any) {
      console.error('Failed to accept invitation:', error);
      toast.error(error.message || 'קבלת ההזמנה נכשלה, אנא נסה שוב');
      throw error;
    }
  },

  // Verify email function
  verifyEmail: async (token: string) => {
    try {
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
