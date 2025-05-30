
import { supabase } from "@/integrations/supabase/client";
import { User, Account, UserAccounts } from '../types';
import { accountService } from './accountService';
import { userService } from './user';
import { clearAllPendingInvitations } from '@/utils/notifications';
import { toast } from 'sonner';

/**
 * Checks the current auth state and returns user, account, and userAccounts if authenticated
 */
export async function checkAuth(): Promise<{ 
  user: User | null, 
  account: Account | null, 
  userAccounts: UserAccounts | null 
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { user: null, account: null, userAccounts: null };
    }
    
    // Create user object based on Supabase session
    const user: User = {
      id: session.user.id,
      email: session.user.email || '',
      name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User'
    };
    
    console.log("User authenticated:", user);
    
    // Check if there is a pending invitation ID in session storage
    const pendingInvitationId = sessionStorage.getItem('pendingInvitationId');
    
    // Use a flag to avoid redirection loops
    let redirectChecked = sessionStorage.getItem('pendingInvitationRedirectChecked');
    
    if (pendingInvitationId && !redirectChecked && user.email) {
      console.log(`Found pendingInvitationId ${pendingInvitationId} in sessionStorage`);
      sessionStorage.setItem('pendingInvitationRedirectChecked', 'true');
      
      try {
        // Verify that the invitation exists and is valid
        const { data: invitation } = await supabase
          .from('invitations')
          .select(`
            invitation_id,
            email,
            account_id,
            accepted_at,
            expires_at
          `)
          .eq('invitation_id', pendingInvitationId)
          .eq('email', user.email.toLowerCase())
          .is('accepted_at', null)
          .gt('expires_at', 'now()');
          
        if (invitation && invitation.length > 0) {
          console.log(`Verified that invitation ${pendingInvitationId} is valid for user ${user.email}`);
          
          // If the user just registered or logged in, redirect to the invitation page
          // but we'll only do this once per session to avoid loops
          const currentPath = window.location.pathname;
          if (!currentPath.includes(`/invitation/${pendingInvitationId}`)) {
            setTimeout(() => {
              window.location.href = `/invitation/${pendingInvitationId}`;
            }, 1000);
            return { user, account: null, userAccounts: null };
          }
        } else {
          console.log("Invitation not found or not valid, clearing pendingInvitationId");
          sessionStorage.removeItem('pendingInvitationId');
          sessionStorage.removeItem('pendingInvitationRedirectChecked');
        }
      } catch (error) {
        console.error("Error verifying invitation:", error);
        sessionStorage.removeItem('pendingInvitationId');
        sessionStorage.removeItem('pendingInvitationRedirectChecked');
      }
    }
    
    // Get all user accounts
    const userAccounts = await accountService.getUserAccounts(user.id);
    console.log("User accounts retrieved:", userAccounts);
    
    // Determine active account based on user preference
    let activeAccount: Account | null = null;
    
    // Get user's selected account preference
    const selectedAccountId = await userService.getSelectedAccountId(user.id);
    console.log("User's selected account ID:", selectedAccountId);
    
    if (selectedAccountId) {
      // Try to find the selected account in user's available accounts
      const allAccounts = [...userAccounts.ownedAccounts, ...userAccounts.sharedAccounts];
      activeAccount = allAccounts.find(acc => acc.id === selectedAccountId) || null;
      
      if (!activeAccount) {
        console.log("Selected account not found in user's available accounts, clearing preference");
        // Clear invalid preference
        try {
          await userService.setSelectedAccountId(user.id, '');
        } catch (error) {
          console.error("Error clearing invalid selected account:", error);
        }
      }
    }
    
    // If no valid selected account, use default logic
    if (!activeAccount) {
      if (userAccounts.sharedAccounts.length > 0) {
        activeAccount = userAccounts.sharedAccounts[0];
      } else if (userAccounts.ownedAccounts.length > 0) {
        activeAccount = userAccounts.ownedAccounts[0];
      } else {
        // Create new account if none exist
        activeAccount = await accountService.getDefaultAccount(user.id, user.name);
        // Refresh user accounts after creating new account
        const updatedUserAccounts = await accountService.getUserAccounts(user.id);
        console.log("Updated user accounts after creation:", updatedUserAccounts);
        return { user, account: activeAccount, userAccounts: updatedUserAccounts };
      }
      
      // Save the default choice as user preference
      if (activeAccount) {
        try {
          await userService.setSelectedAccountId(user.id, activeAccount.id);
        } catch (error) {
          console.error("Error saving default account preference:", error);
        }
      }
    }
    
    console.log("Active account selected:", activeAccount);
    return { user, account: activeAccount, userAccounts };
  } catch (error) {
    console.error('Error checking authentication:', error);
    return { user: null, account: null, userAccounts: null };
  }
}
