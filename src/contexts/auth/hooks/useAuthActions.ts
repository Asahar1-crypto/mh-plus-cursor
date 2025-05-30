
import { useCallback } from 'react';
import { authService } from '../authService';
import { User, Account, UserAccounts } from '../types';
import { toast } from 'sonner';

/**
 * Custom hook for authentication actions
 */
export const useAuthActions = (
  user: User | null,
  account: Account | null,
  setUser: (user: User | null) => void,
  setAccount: (account: Account | null) => void,
  setUserAccounts: (userAccounts: UserAccounts | null) => void,
  setIsLoading: (loading: boolean) => void,
  checkAndSetUserData: () => Promise<void>
) => {
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await authService.login(email, password);
      setUser(result.user);
      setAccount(result.account);
      // userAccounts will be set by the checkAndSetUserData call triggered by auth state change
      toast.success('התחברת בהצלחה!');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [setUser, setAccount, setIsLoading]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      await authService.register(name, email, password);
      toast.success('נרשמת בהצלחה! בדוק את המייל שלך לאישור');
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setAccount(null);
      setUserAccounts(null);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [setUser, setAccount, setUserAccounts, setIsLoading]);

  const sendInvitation = useCallback(async (email: string) => {
    if (!user || !account) {
      throw new Error('User or account not found');
    }
    await authService.sendInvitation(email, user, account);
  }, [user, account]);

  const removeInvitation = useCallback(async () => {
    if (!account) {
      throw new Error('Account not found');
    }
    await authService.removeInvitation(account);
    // Refresh user data after removing invitation
    await checkAndSetUserData();
  }, [account, checkAndSetUserData]);

  const acceptInvitation = useCallback(async (invitationId: string) => {
    if (!user) {
      throw new Error('User not found');
    }
    await authService.acceptInvitation(invitationId, user);
    // Refresh user data after accepting invitation
    await checkAndSetUserData();
  }, [user, checkAndSetUserData]);

  const verifyEmail = useCallback(async (token: string) => {
    return authService.verifyEmail(token);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await authService.resetPassword(email);
  }, []);

  const switchAccount = useCallback(async (accountId: string) => {
    if (!user) {
      throw new Error('User not found');
    }
    
    setIsLoading(true);
    try {
      const result = await authService.switchAccount(user.id, accountId);
      setAccount(result.account);
      setUserAccounts(result.userAccounts);
      toast.success(`עברת לחשבון: ${result.account.name}`);
    } catch (error) {
      console.error('Switch account failed:', error);
      toast.error('שגיאה במעבר בין חשבונות');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user, setAccount, setUserAccounts, setIsLoading]);

  return {
    login,
    register,
    logout,
    sendInvitation,
    removeInvitation,
    acceptInvitation,
    verifyEmail,
    resetPassword,
    switchAccount
  };
};
