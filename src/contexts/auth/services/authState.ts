
import { supabase } from "@/integrations/supabase/client";
import { User, Account, UserAccounts } from '../types';
import { accountCreationService } from './account/accountCreationService';
import { ownedAccountService } from './account/ownedAccountService';
import { sharedAccountService } from './account/sharedAccountService';
import { selectedAccountService } from './user/selectedAccountService';

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
    
    // Get all user accounts
    const userAccounts = await getUserAccounts(user.id);
    console.log('User accounts loaded:', userAccounts);
    
    // Determine active account with priority for shared accounts
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
  
  // Get owned accounts
  const ownedAccounts = await ownedAccountService.getAllOwnedAccounts(userId);
  
  // Get shared accounts
  const sharedAccounts = await sharedAccountService.getAllSharedAccounts(userId);
  
  console.log(`Found ${ownedAccounts.length} owned accounts and ${sharedAccounts.length} shared accounts`);
  
  return {
    ownedAccounts,
    sharedAccounts
  };
};

/**
 * Determine which account should be active
 * Priority: 1. Shared accounts (most recent activity), 2. Selected account, 3. First owned account
 */
export const determineActiveAccount = async (userId: string, userAccounts: UserAccounts): Promise<Account | null> => {
  // Priority 1: If user has shared accounts, use the most recent one (indicates recent invitation acceptance)
  if (userAccounts.sharedAccounts.length > 0) {
    console.log('User has shared accounts, prioritizing the first shared account');
    return userAccounts.sharedAccounts[0];
  }
  
  // Priority 2: Check user's selected account preference
  try {
    const selectedAccountId = await selectedAccountService.getSelectedAccountId(userId);
    if (selectedAccountId) {
      const selectedAccount = userAccounts.ownedAccounts.find(acc => acc.id === selectedAccountId);
      if (selectedAccount) {
        console.log('Found selected account from preference:', selectedAccount.name);
        return selectedAccount;
      }
    }
  } catch (error) {
    console.error('Error getting selected account:', error);
  }
  
  // Priority 3: Use first owned account
  if (userAccounts.ownedAccounts.length > 0) {
    console.log('Using first owned account as default');
    return userAccounts.ownedAccounts[0];
  }
  
  // Priority 4: Create new account if none exists
  console.log('No accounts found, creating new account');
  try {
    // Get user profile to get name
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .single();
    
    const userName = profile?.name || 'User';
    const newAccount = await accountCreationService.createNewAccount(userId, userName);
    return newAccount;
  } catch (error) {
    console.error('Failed to create new account:', error);
    return null;
  }
};
