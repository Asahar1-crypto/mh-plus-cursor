
import { User, Account } from '../types';
import { userService } from './user';
import { accountService } from './accountService';
import { showInvitationNotification } from '@/utils/notifications';

export async function login(email: string, password: string) {
  try {
    // Sign in with Supabase
    const user = await userService.login(email, password);
    
    // Get default account
    const account = await accountService.getDefaultAccount(user.id, user.name);
    
    // Check for valid invitations by email that haven't been accepted yet
    const invitations = await userService.checkPendingInvitations(email);
    
    // If there's a pending invitation, notify the user
    if (invitations && invitations.length > 0) {
      console.log(`Found ${invitations.length} pending invitations after login for ${email}`);
      
      // Store the invitation in localStorage so we can access it later
      const pendingInvitations = {};
      invitations.forEach(inv => {
        // Safely access properties using optional chaining
        const accountName = inv.accounts ? inv.accounts.name : 'חשבון משותף';
        const ownerName = inv.owner_profile ? inv.owner_profile.name : 'בעל החשבון';
        
        pendingInvitations[inv.invitation_id] = {
          name: accountName,
          ownerName,
          sharedWithEmail: inv.email,
          invitationId: inv.invitation_id
        };
      });
      
      localStorage.setItem('pendingInvitations', JSON.stringify(pendingInvitations));
      
      // Notify the user about the pending invitation - use the utility function instead of JSX
      showInvitationNotification(invitations[0].invitation_id);
    }
    
    // Check if there's a pendingInvitationId in sessionStorage
    const pendingInvitationId = sessionStorage.getItem('pendingInvitationId');
    if (pendingInvitationId) {
      console.log(`Found pendingInvitationId ${pendingInvitationId} in sessionStorage after login`);
      
      // Clear the pending invitation ID
      sessionStorage.removeItem('pendingInvitationId');
      
      // Redirect to the invitation page
      setTimeout(() => {
        window.location.href = `/invitation/${pendingInvitationId}`;
      }, 1000);
    }
    
    return { user, account };
  } catch (error: any) {
    throw error;
  }
}

export async function register(name: string, email: string, password: string) {
  return userService.register(name, email, password);
}

export async function logout() {
  return userService.logout();
}

export async function verifyEmail(token: string) {
  return userService.verifyEmail(token);
}

export async function resetPassword(email: string) {
  return userService.resetPassword(email);
}
