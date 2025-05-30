
import { useState, useCallback } from 'react';
import { User, Account, UserAccounts } from '../types';
import { authService } from '../authService';
import { invitationCheckService } from '../services/user/invitationCheckService';
import { toast } from 'sonner';

/**
 * Custom hook for managing authentication state
 */
export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [userAccounts, setUserAccounts] = useState<UserAccounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<number>(0);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  const checkAndSetUserData = useCallback(async (): Promise<void> => {
    // Avoid multiple simultaneous checks
    const now = Date.now();
    if (now - lastCheck < 1000 || isCheckingAuth) {
      console.log('Skipping auth check - too soon since last check or already checking');
      return;
    }
    
    setLastCheck(now);
    setIsCheckingAuth(true);
    console.log('Checking auth state...');
    setIsLoading(true);
    
    try {
      const authResult = await authService.checkAuth();
      console.log('Auth check result:', { 
        user: authResult.user ? `${authResult.user.id} (${authResult.user.email})` : null, 
        account: authResult.account ? `${authResult.account.id} (${authResult.account.name})` : null,
        userAccounts: authResult.userAccounts ? 
          `${authResult.userAccounts.ownedAccounts.length} owned, ${authResult.userAccounts.sharedAccounts.length} shared` : null
      });
      
      setUser(authResult.user);
      setAccount(authResult.account);
      setUserAccounts(authResult.userAccounts);
      
      // Check for new invitations when user data is loaded
      if (authResult.user?.email) {
        setTimeout(async () => {
          try {
            await invitationCheckService.checkPendingInvitations(authResult.user.email);
          } catch (error) {
            console.error("Failed to check pending invitations:", error);
          }
        }, 1000);
      }
    } catch (error) {
      console.error("Failed to check auth state:", error);
      
      // Only show toast for non-network errors
      if (error instanceof Error && 
          !error.message.includes('network') && 
          !error.message.includes('connection')) {
        toast.error("שגיאה בבדיקת מצב ההתחברות");
      }
      
      // Clear state on critical errors
      setUser(null);
      setAccount(null);
      setUserAccounts(null);
    } finally {
      setIsLoading(false);
      setIsCheckingAuth(false);
    }
  }, [lastCheck, isCheckingAuth]);

  return {
    user,
    setUser,
    account,
    setAccount,
    userAccounts,
    setUserAccounts,
    isLoading,
    setIsLoading,
    checkAndSetUserData
  };
};
