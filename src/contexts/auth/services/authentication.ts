
import { User, Account } from '../types';
import { userService } from './user';
import { accountService } from './accountService';
import { showInvitationNotification, clearInvalidInvitations } from '@/utils/notifications';

export async function login(email: string, password: string) {
  try {
    // Sign in with Supabase
    const user = await userService.login(email, password);
    
    // ניקוי הזמנות לא רלוונטיות מהאחסון המקומי
    clearInvalidInvitations(email);
    
    // Get default account
    const account = await accountService.getDefaultAccount(user.id, user.name);
    
    // Improved invitation checking to ensure proper data is stored
    try {
      const invitations = await userService.checkPendingInvitations(email);
      
      // If there's a pending invitation, notify the user
      if (invitations && invitations.length > 0) {
        console.log(`Found ${invitations.length} pending invitations after login for ${email}`);
        
        // Store the invitation in localStorage so we can access it later
        const pendingInvitations = {};
        invitations.forEach(inv => {
          // Safety checks to ensure we're dealing with valid data
          if (typeof inv === 'object' && inv !== null && !('error' in inv)) {
            // Safely access properties using optional chaining and nullish coalescing
            const accountName = inv.accounts?.name || 'חשבון משותף';
            // Owner name might come from either accounts.profiles or owner_profile
            const ownerName = inv.accounts?.profiles?.name || inv.owner_profile?.name || 'בעל החשבון';
            const ownerId = inv.accounts?.owner_id; // Store the owner ID
            
            pendingInvitations[inv.invitation_id] = {
              name: accountName,
              ownerName,
              ownerId, // Store the owner ID in localStorage
              sharedWithEmail: inv.email,
              invitationId: inv.invitation_id,
              accountId: inv.account_id // Store the account ID
            };
          } else {
            console.error("Invalid invitation data:", inv);
          }
        });
        
        localStorage.setItem('pendingInvitations', JSON.stringify(pendingInvitations));
        
        // Notify the user about the pending invitation
        if (invitations[0] && invitations[0].invitation_id) {
          showInvitationNotification(invitations[0].invitation_id);
        }
      }
    } catch (error) {
      console.error('Error checking invitations after login:', error);
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
