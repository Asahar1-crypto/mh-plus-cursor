
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
      
      // Check if the user has an account as owner
      const { data: ownedAccounts, error: ownedAccountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('owner_id', user.id)
        .limit(1);
        
      if (ownedAccountsError) throw ownedAccountsError;
      
      // Check if user is shared with any account
      const { data: sharedAccounts, error: sharedAccountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('shared_with_id', user.id)
        .limit(1);
        
      if (sharedAccountsError) throw sharedAccountsError;
      
      // Check for valid invitations by email
      const { data: invitations, error: invitationsError } = await supabase
        .from('invitations')
        .select('*')
        .eq('email', user.email)
        .is('accepted_at', null)
        .gt('expires_at', 'now()')
        .limit(1);
        
      if (invitationsError) throw invitationsError;
      
      // Prioritize accounts: owned > shared > invitations
      let account: Account | null = null;
      
      if (ownedAccounts && ownedAccounts.length > 0) {
        account = {
          id: ownedAccounts[0].id,
          name: ownedAccounts[0].name,
          ownerId: ownedAccounts[0].owner_id,
          sharedWithId: ownedAccounts[0].shared_with_id
        };
      } else if (sharedAccounts && sharedAccounts.length > 0) {
        account = {
          id: sharedAccounts[0].id,
          name: sharedAccounts[0].name,
          ownerId: sharedAccounts[0].owner_id,
          sharedWithId: sharedAccounts[0].shared_with_id
        };
      } else if (invitations && invitations.length > 0) {
        // There's an invitation, but user needs to accept it separately
        // We don't auto-accept here, but we could show a notification
        console.log('Pending invitation found:', invitations[0]);
      } else {
        // Create a simulated account since we don't have an actual one yet
        account = {
          id: `account-${user.id}`,
          name: `משפחת ${user.name}`,
          ownerId: user.id
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
      
      // Create user object
      const user: User = {
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User'
      };
      
      // Check if the user has an account as owner
      const { data: ownedAccounts, error: ownedAccountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('owner_id', user.id)
        .limit(1);
        
      if (ownedAccountsError) throw ownedAccountsError;
      
      // Check if user is shared with any account
      const { data: sharedAccounts, error: sharedAccountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('shared_with_id', user.id)
        .limit(1);
        
      if (sharedAccountsError) throw sharedAccountsError;
      
      // Check for valid invitations by email that haven't been accepted yet
      const { data: invitations, error: invitationsError } = await supabase
        .from('invitations')
        .select('*')
        .eq('email', user.email)
        .is('accepted_at', null)
        .gt('expires_at', 'now()')
        .limit(1);
        
      if (invitationsError) throw invitationsError;
      
      // Prioritize accounts: owned > shared > create new
      let account: Account | null = null;
      
      if (ownedAccounts && ownedAccounts.length > 0) {
        account = {
          id: ownedAccounts[0].id,
          name: ownedAccounts[0].name,
          ownerId: ownedAccounts[0].owner_id,
          sharedWithId: ownedAccounts[0].shared_with_id
        };
      } else if (sharedAccounts && sharedAccounts.length > 0) {
        account = {
          id: sharedAccounts[0].id,
          name: sharedAccounts[0].name,
          ownerId: sharedAccounts[0].owner_id,
          sharedWithId: sharedAccounts[0].shared_with_id
        };
      } else {
        // Create a new account for the user if they don't have one
        const { data: newAccount, error: newAccountError } = await supabase
          .from('accounts')
          .insert({
            name: `משפחת ${user.name}`,
            owner_id: user.id
          })
          .select()
          .single();
          
        if (newAccountError) {
          console.error('Error creating account:', newAccountError);
          // Create a temporary account object
          account = {
            id: `account-${user.id}`,
            name: `משפחת ${user.name}`,
            ownerId: user.id
          };
        } else {
          account = {
            id: newAccount.id,
            name: newAccount.name,
            ownerId: newAccount.owner_id,
            sharedWithId: newAccount.shared_with_id
          };
        }
      }
      
      // If there's a pending invitation, notify the user
      if (invitations && invitations.length > 0) {
        // Store the invitation in localStorage so we can access it later
        localStorage.setItem('pendingInvitations', JSON.stringify({
          [invitations[0].invitation_id]: {
            id: invitations[0].id,
            accountId: invitations[0].account_id,
            email: invitations[0].email,
            invitationId: invitations[0].invitation_id
          }
        }));
        
        // Notify the user about the pending invitation
        toast.info(
          <div>
            יש לך הזמנה לחשבון משותף! 
            <a href={`/invitation/${invitations[0].invitation_id}`} className="underline ml-1">לחץ כאן לצפייה</a>
          </div>, 
          { duration: 10000 }
        );
      }
      
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

      // Check for pending invitations
      if (data.user) {
        const { data: invitations, error: invitationsError } = await supabase
          .from('invitations')
          .select('*')
          .eq('email', email)
          .is('accepted_at', null)
          .gt('expires_at', 'now()')
          .limit(1);
          
        if (!invitationsError && invitations && invitations.length > 0) {
          // Store the invitation in localStorage so we can access it later
          localStorage.setItem('pendingInvitations', JSON.stringify({
            [invitations[0].invitation_id]: {
              id: invitations[0].id,
              accountId: invitations[0].account_id,
              email: invitations[0].email,
              invitationId: invitations[0].invitation_id
            }
          }));
          
          // We will inform them about the invitation after they verify their email
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
      // Check if there's already an invitation for this email
      const { data: existingInvitations, error: checkError } = await supabase
        .from('invitations')
        .select('*')
        .eq('account_id', account.id)
        .eq('email', email)
        .is('accepted_at', null)
        .gt('expires_at', 'now()');
        
      if (checkError) throw checkError;
      
      if (existingInvitations && existingInvitations.length > 0) {
        // Return the existing invitation
        console.log(`Invitation already exists for ${email}, reusing: ${existingInvitations[0].invitation_id}`);
        
        // Update the account object
        const updatedAccount: Account = {
          ...account,
          sharedWithEmail: email,
          invitationId: existingInvitations[0].invitation_id
        };
        
        return updatedAccount;
      }
      
      // Generate a unique invitation ID
      const invitationId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Insert the invitation into Supabase
      const { error: insertError } = await supabase
        .from('invitations')
        .insert({
          account_id: account.id,
          email: email,
          invitation_id: invitationId
        });
        
      if (insertError) throw insertError;
      
      // Simulate sending an email
      console.log(`Email would be sent to ${email} with invitation link: /invitation/${invitationId}`);
      
      // In a real implementation, this would update the database
      const updatedAccount: Account = {
        ...account,
        sharedWithEmail: email,
        invitationId: invitationId
      };
      
      // Store the invitation in localStorage for the demo
      const pendingInvitations = JSON.parse(localStorage.getItem('pendingInvitations') || '{}');
      pendingInvitations[invitationId] = {
        name: account.name,
        ownerName: user.name,
        sharedWithEmail: email,
        invitationId: invitationId
      };
      localStorage.setItem('pendingInvitations', JSON.stringify(pendingInvitations));
      
      return updatedAccount;
    } catch (error) {
      console.error('Failed to send invitation:', error);
      toast.error('שליחת ההזמנה נכשלה, אנא נסה שוב');
      throw error;
    }
  },

  // Remove invitation function
  removeInvitation: async (account: Account) => {
    try {
      // In a real implementation with Supabase, we'd mark the invitation as deleted or remove it
      if (account.invitationId) {
        // Remove the invitation from supabase
        const { error } = await supabase
          .from('invitations')
          .update({ accepted_at: null }) // Set to null to indicate it was revoked
          .eq('invitation_id', account.invitationId);
          
        if (error) throw error;
        
        // Remove from localStorage for the demo
        const pendingInvitations = JSON.parse(localStorage.getItem('pendingInvitations') || '{}');
        delete pendingInvitations[account.invitationId];
        localStorage.setItem('pendingInvitations', JSON.stringify(pendingInvitations));
      }
      
      // Update the account in Supabase if there's a shared user
      if (account.sharedWithId) {
        const { error } = await supabase
          .from('accounts')
          .update({ shared_with_id: null })
          .eq('id', account.id);
          
        if (error) throw error;
      }
      
      // Return the updated account object
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

  // Accept invitation function
  acceptInvitation: async (invitationId: string, user: User) => {
    try {
      // Find the invitation in Supabase
      const { data: invitations, error: findError } = await supabase
        .from('invitations')
        .select('*')
        .eq('invitation_id', invitationId)
        .is('accepted_at', null)
        .gt('expires_at', 'now()')
        .limit(1);
        
      if (findError) throw findError;
      
      if (!invitations || invitations.length === 0) {
        throw new Error('ההזמנה לא נמצאה או שפג תוקפה');
      }
      
      const invitation = invitations[0];
      
      // Validate that the invitation is for this user
      if (invitation.email !== user.email) {
        throw new Error(`ההזמנה מיועדת ל-${invitation.email} אך אתה מחובר כ-${user.email}`);
      }
      
      // Get the account details
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', invitation.account_id)
        .single();
        
      if (accountError) throw accountError;
      
      // Update the account to add the shared user
      const { error: updateError } = await supabase
        .from('accounts')
        .update({ shared_with_id: user.id })
        .eq('id', invitation.account_id);
        
      if (updateError) throw updateError;
      
      // Mark the invitation as accepted
      const { error: acceptError } = await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);
        
      if (acceptError) throw acceptError;
      
      // Create account object to return
      const account: Account = {
        id: accountData.id,
        name: accountData.name,
        ownerId: accountData.owner_id,
        sharedWithId: user.id,
        invitationId: invitationId
      };
      
      // Remove from localStorage for the demo
      const pendingInvitations = JSON.parse(localStorage.getItem('pendingInvitations') || '{}');
      delete pendingInvitations[invitationId];
      localStorage.setItem('pendingInvitations', JSON.stringify(pendingInvitations));
      
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
      
      // Check if there are pending invitations
      const pendingInvitations = JSON.parse(localStorage.getItem('pendingInvitations') || '{}');
      const hasInvitations = Object.keys(pendingInvitations).length > 0;
      
      if (hasInvitations) {
        // Notify the user about pending invitations
        toast.info(
          <div>
            יש לך הזמנות לחשבונות משותפים! 
            <a href="/account-settings" className="underline ml-1">צפה בהזמנות</a>
          </div>,
          { duration: 10000 }
        );
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
