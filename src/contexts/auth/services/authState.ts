
import { supabase } from "@/integrations/supabase/client";
import { User, Account, UserAccounts } from '../types';
import { userService } from './user';
import { accountService } from './accountService';

interface AuthStateResult {
  user: User | null;
  account: Account | null;
  userAccounts: UserAccounts | null;
}

// Add a simple cache to prevent multiple concurrent auth checks
let authCheckInProgress = false;
let lastAuthCheck: AuthStateResult | null = null;
let lastCheckTime = 0;

export const checkAuth = async (): Promise<AuthStateResult> => {
  // Prevent multiple concurrent checks
  if (authCheckInProgress) {
    console.log('Auth check already in progress, waiting...');
    // Wait for ongoing check and return its result
    while (authCheckInProgress) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (lastAuthCheck && Date.now() - lastCheckTime < 1000) {
      return lastAuthCheck;
    }
  }

  authCheckInProgress = true;
  console.log('Starting auth check...');

  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      console.log('No session found');
      const result = { user: null, account: null, userAccounts: null };
      lastAuthCheck = result;
      lastCheckTime = Date.now();
      return result;
    }

    console.log('Session found for user:', session.user.id);

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, selected_account_id')
      .eq('id', session.user.id)
      .single();

    const user: User = {
      id: session.user.id,
      email: session.user.email!,
      name: profile?.name || session.user.email!.split('@')[0]
    };

    console.log('User profile loaded:', user);

    try {
      // Get user accounts with improved error handling
      const userAccounts = await accountService.getUserAccounts(user.id);
      console.log('User accounts loaded:', userAccounts);

      // Determine active account with better logic
      let activeAccount: Account | null = null;
      const allAccounts = [...userAccounts.ownedAccounts, ...userAccounts.sharedAccounts];
      
      if (allAccounts.length === 0) {
        console.log('No accounts found, creating default account for user:', user.id);
        try {
          // Create default account if none exist
          activeAccount = await accountService.getDefaultAccount(user.id, user.name);
          console.log('Created default account:', activeAccount);
          
          // Refresh user accounts after creating default account
          const refreshedAccounts = await accountService.getUserAccounts(user.id);
          
          const result = { user, account: activeAccount, userAccounts: refreshedAccounts };
          lastAuthCheck = result;
          lastCheckTime = Date.now();
          return result;
        } catch (createError) {
          console.error('Failed to create default account:', createError);
          // Continue without account instead of failing completely
          const result = { user, account: null, userAccounts: { ownedAccounts: [], sharedAccounts: [] } };
          lastAuthCheck = result;
          lastCheckTime = Date.now();
          return result;
        }
      }

      // Get selected account ID from user preference
      const selectedAccountId = profile?.selected_account_id;
      
      if (selectedAccountId) {
        // Try to find the selected account
        activeAccount = allAccounts.find(acc => acc.id === selectedAccountId) || null;
        console.log('Found selected account from preference:', activeAccount?.name);
      }
      
      if (!activeAccount) {
        // Fallback: use the first owned account, or first shared account if no owned accounts
        activeAccount = userAccounts.ownedAccounts[0] || userAccounts.sharedAccounts[0] || null;
        console.log('Using fallback account:', activeAccount?.name);
        
        // Save this choice as user preference
        if (activeAccount) {
          await userService.setSelectedAccountId(user.id, activeAccount.id);
        }
      }

      const result = { user, account: activeAccount, userAccounts };
      lastAuthCheck = result;
      lastCheckTime = Date.now();
      return result;
    } catch (accountError) {
      console.error('Error loading account data:', accountError);
      
      // Try to create a default account as fallback
      try {
        console.log('Attempting to create fallback account for user:', user.id);
        const defaultAccount = await accountService.getDefaultAccount(user.id, user.name);
        const fallbackAccounts = await accountService.getUserAccounts(user.id);
        
        const result = { user, account: defaultAccount, userAccounts: fallbackAccounts };
        lastAuthCheck = result;
        lastCheckTime = Date.now();
        return result;
      } catch (fallbackError) {
        console.error('Failed to create fallback account:', fallbackError);
        // Return user without account instead of failing completely
        const result = { user, account: null, userAccounts: { ownedAccounts: [], sharedAccounts: [] } };
        lastAuthCheck = result;
        lastCheckTime = Date.now();
        return result;
      }
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    const result = { user: null, account: null, userAccounts: null };
    lastAuthCheck = result;
    lastCheckTime = Date.now();
    return result;
  } finally {
    authCheckInProgress = false;
  }
};
