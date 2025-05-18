
import { useState } from 'react';
import { User, Account } from '../types';
import { authService } from '../authService';
import { invitationCheckService } from '../services/user/invitationCheckService';

/**
 * Custom hook for managing authentication state
 */
export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAndSetUserData = async () => {
    setIsLoading(true);
    try {
      const { user, account } = await authService.checkAuth();
      setUser(user);
      setAccount(account);
      
      // Check for new invitations when user data is loaded
      if (user?.email) {
        setTimeout(async () => {
          await invitationCheckService.checkPendingInvitations(user.email);
        }, 1000);
      }
    } catch (error) {
      console.error("Failed to check auth state:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
