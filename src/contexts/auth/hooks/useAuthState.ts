
import { useState, useCallback } from 'react';
import { User, Account } from '../types';
import { authService } from '../authService';
import { invitationCheckService } from '../services/user/invitationCheckService';
import { toast } from 'sonner';

/**
 * Custom hook for managing authentication state
 */
export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAndSetUserData = useCallback(async () => {
    console.log('Checking auth state...');
    setIsLoading(true);
    try {
      const { user, account } = await authService.checkAuth();
      console.log('Auth check result:', { user: !!user, account: !!account });
      setUser(user);
      setAccount(account);
      
      // Check for new invitations when user data is loaded
      if (user?.email) {
        setTimeout(async () => {
          try {
            await invitationCheckService.checkPendingInvitations(user.email);
          } catch (error) {
            console.error("Failed to check pending invitations:", error);
          }
        }, 1000);
      }
    } catch (error) {
      console.error("Failed to check auth state:", error);
      toast.error("שגיאה בבדיקת מצב ההתחברות");
      // Clear state on error to prevent inconsistent state
      setUser(null);
      setAccount(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    user,
    setUser,
    account,
    setAccount,
    isLoading,
    setIsLoading,
    checkAndSetUserData
  };
};
