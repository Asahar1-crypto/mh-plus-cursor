
import { supabase } from "@/integrations/supabase/client";
import { User, Account, UserAccounts } from '../types';
import { accountService } from './account';
import { selectedAccountService } from './user/selectedAccountService';
import { autoAcceptRegistrationInvitations, hasPendingRegistrationInvitations } from './invitation/autoAcceptInvitations';

/**
 * Check authentication state and load user data
 */
export const checkAuth = async (): Promise<{
  user: User | null;
  account: Account | null;
  userAccounts: UserAccounts | null;
}> => {
  try {
    console.log('Getting current session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      throw sessionError;
    }
    
    if (!session?.user) {
      console.log('No active session found');
      return { user: null, account: null, userAccounts: null };
    }
    
    console.log('Session found for user:', session.user.id);
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
      
    if (profileError) {
      console.error('Profile error:', profileError);
      throw new Error('Failed to load user profile');
    }
    
    const user: User = {
      id: session.user.id,
      email: session.user.email!,
      name: profile?.name || session.user.email!.split('@')[0]
    };
    
    console.log('User profile loaded:', user);
    
    // Check for pending invitations from registration and auto-accept them
    if (hasPendingRegistrationInvitations()) {
      console.log('Found pending registration invitations, auto-accepting...');
      try {
        await autoAcceptRegistrationInvitations(user);
        console.log('Auto-acceptance completed, refreshing account data...');
      } catch (error) {
        console.error('Error during auto-acceptance:', error);
      }
    }
    
    // Get all user accounts (this will be refreshed after auto-acceptance)
    const userAccounts = await getUserAccounts(user.id);
    console.log('User accounts loaded:', userAccounts);
    
    // Determine active account with improved logic
    const activeAccount = await determineActiveAccount(user.id, userAccounts);
    console.log('Active account determined:', activeAccount);
    
    return {
      user,
      account: activeAccount,
      userAccounts
    };
  } catch (error) {
    console.error('Auth check failed:', error);
    throw error;
  }
};

/**
 * Get all accounts for a user (owned and shared)
 */
export const getUserAccounts = async (userId: string): Promise<UserAccounts> => {
  console.log('Getting accounts for user', userId);
  
  // Use the new member-based account service
  return await accountService.getUserAccounts(userId);
};

/**
 * Determine which account should be active
 * Improved logic to prevent wrong account selection
 */
export const determineActiveAccount = async (userId: string, userAccounts: UserAccounts): Promise<Account | null> => {
  // Priority 1: Check user's selected account preference first
  try {
    const selectedAccountId = await selectedAccountService.getSelectedAccountId(userId);
    if (selectedAccountId) {
      // Look for the selected account in both owned and shared accounts
      const allAccounts = [...userAccounts.ownedAccounts, ...userAccounts.sharedAccounts];
      const selectedAccount = allAccounts.find(acc => acc.id === selectedAccountId);
      if (selectedAccount) {
        console.log('Found selected account from preference:', selectedAccount.name);
        return selectedAccount;
      }
    }
  } catch (error) {
    console.error('Error getting selected account:', error);
  }
  
  // Priority 2: If user has shared accounts, use the most recent one ONLY if no preference is set
  if (userAccounts.sharedAccounts.length > 0) {
    console.log('User has shared accounts, using the first shared account');
    return userAccounts.sharedAccounts[0];
  }
  
  // Priority 3: Use first owned account
  if (userAccounts.ownedAccounts.length > 0) {
    console.log('Using first owned account as default');
    return userAccounts.ownedAccounts[0];
  }
  
  // Priority 4: No accounts found - return null to show NoAccountScreen
  console.log('No accounts found for user - user will see account creation options');
  return null;
};
