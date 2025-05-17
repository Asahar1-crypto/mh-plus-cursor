
import { User, Account } from '../types';
import { userService } from './user';
import { accountService } from './accountService';
import { showInvitationNotification, clearInvalidInvitations, checkForNewInvitations } from '@/utils/notifications';
import { InvitationData } from './invitation/types';

export async function login(email: string, password: string) {
  try {
    // Sign in with Supabase
    const user = await userService.login(email, password);
    
    // ניקוי הזמנות לא רלוונטיות מהאחסון המקומי
    clearInvalidInvitations(email);
    
    // Get default account
    const account = await accountService.getDefaultAccount(user.id, user.name);
    
    // בדיקת הזמנות חדשות
    await checkForNewInvitations(email);
    
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
