
import { User, Account } from '../types';
import { userService } from './user';
import { accountService } from './accountService';
import { checkForNewInvitations } from '@/utils/notifications';
import { InvitationData } from './invitation/types';

export async function login(email: string, password: string) {
  try {
    console.log(`Attempting to log in user: ${email}`);
    
    // Sign in with Supabase
    const user = await userService.login(email, password);
    console.log('Login successful:', user);
    
    // Get default account
    const account = await accountService.getDefaultAccount(user.id, user.name);
    console.log('Retrieved account:', account);
    
    // Check for new invitations
    await checkForNewInvitations(email);
    console.log('Checked for new invitations');
    
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
    console.error("Login error:", error);
    throw error;
  }
}

export async function register(name: string, email: string, password: string, phoneNumber?: string) {
  return userService.register(name, email, password, phoneNumber);
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
