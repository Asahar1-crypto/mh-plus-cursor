import { authService } from '../authService';
import { User, Account } from '../types';
import { invitationCheckService } from '../services/user/invitationCheckService';

export const useAuthActions = (
  user: User | null,
  account: Account | null,
  setUser: (user: User | null) => void,
  setAccount: (account: Account | null) => void,
  setIsLoading: (isLoading: boolean) => void,
  checkAndSetUserData: () => Promise<void>
) => {
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { user, account } = await authService.login(email, password);
      setUser(user);
      setAccount(account);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      await authService.register(name, email, password);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setAccount(null);
    } finally {
      setIsLoading(false);
    }
  };

  const sendInvitation = async (email: string) => {
    if (!user || !account) {
      console.error('Cannot send invitation: User not authenticated or no account available');
      throw new Error('User not authenticated');
    }
    
    console.log(`AuthProvider: Starting invitation process for email ${email}`);
    setIsLoading(true);
    
    try {
      const updatedAccount = await authService.sendInvitation(email, user, account);
      console.log('AuthProvider: Invitation process completed successfully, updating account state');
      setAccount(updatedAccount);
      return Promise.resolve();
    } catch (error) {
      console.error('AuthProvider: Failed to send invitation:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const removeInvitation = async () => {
    if (!user || !account) {
      console.error('Cannot remove invitation: User not authenticated or no account available');
      throw new Error('User not authenticated');
    }
    
    setIsLoading(true);
    try {
      console.log("AuthProvider: Starting to remove invitation for account:", account);
      const updatedAccount = await authService.removeInvitation(account);
      console.log("AuthProvider: Updated account after removing invitation:", updatedAccount);
      setAccount(updatedAccount);
      return Promise.resolve();
    } catch (error) {
      console.error("AuthProvider: Error removing invitation:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const acceptInvitation = async (invitationId: string) => {
    if (!user) {
      console.error('Cannot accept invitation: User not authenticated');
      throw new Error('User not authenticated');
    }
    
    setIsLoading(true);
    try {
      const updatedAccount = await authService.acceptInvitation(invitationId, user);
      setAccount(updatedAccount);
    } catch (error) {
      console.error('AuthProvider: Failed to accept invitation:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmail = async (token: string) => {
    setIsLoading(true);
    try {
      return await authService.verifyEmail(token);
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setIsLoading(true);
    try {
      await authService.resetPassword(email);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    login,
    register,
    logout,
    sendInvitation,
    removeInvitation,
    acceptInvitation,
    verifyEmail,
    resetPassword
  };
};
