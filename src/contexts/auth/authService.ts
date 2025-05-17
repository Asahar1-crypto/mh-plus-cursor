
import { toast } from 'sonner';
import { User, Account } from './types';
import { supabase } from "@/integrations/supabase/client";
import { userService } from './services/userService';
import { accountService } from './services/accountService';
import { invitationService } from './services/invitationService';

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
      
      // Get user account
      const account = await accountService.getDefaultAccount(user.id, user.name);
      
      // Check for valid invitations by email
      const invitations = await userService.checkPendingInvitations(user.email);
      
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
        
        // Notify the user about the pending invitation using a string-based message
        toast.info(`יש לך הזמנה לחשבון משותף! לצפייה בהזמנה: /invitation/${invitations[0].invitation_id}`, 
          { duration: 10000 }
        );
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
      const user = await userService.login(email, password);
      
      // Get default account
      const account = await accountService.getDefaultAccount(user.id, user.name);
      
      // Check for valid invitations by email that haven't been accepted yet
      const invitations = await userService.checkPendingInvitations(email);
      
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
        
        // Notify the user about the pending invitation using a string-based message
        toast.info(`יש לך הזמנה לחשבון משותף! לצפייה בהזמנה: /invitation/${invitations[0].invitation_id}`, 
          { duration: 10000 }
        );
      }
      
      return { user, account };
    } catch (error: any) {
      throw error;
    }
  },

  // Register function - delegate to userService
  register: async (name: string, email: string, password: string) => {
    return userService.register(name, email, password);
  },

  // Logout function - delegate to userService
  logout: async () => {
    return userService.logout();
  },

  // Send invitation function - delegate to invitationService
  sendInvitation: async (email: string, user: User, account: Account) => {
    return invitationService.sendInvitation(email, user, account);
  },

  // Remove invitation function - delegate to invitationService
  removeInvitation: async (account: Account) => {
    return invitationService.removeInvitation(account);
  },

  // Accept invitation function - delegate to invitationService
  acceptInvitation: async (invitationId: string, user: User) => {
    return invitationService.acceptInvitation(invitationId, user);
  },

  // Verify email function - delegate to userService
  verifyEmail: async (token: string) => {
    return userService.verifyEmail(token);
  },

  // Reset password function - delegate to userService
  resetPassword: async (email: string) => {
    return userService.resetPassword(email);
  }
};
