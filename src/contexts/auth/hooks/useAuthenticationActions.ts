
import { useState } from 'react';
import { toast } from 'sonner';
import { User, Account, UserAccounts } from '../types';
import { authService } from '../authService';

export const useAuthenticationActions = (
  setUser: (user: User | null) => void,
  setAccount: (account: Account | null) => void,
  setUserAccounts: (userAccounts: UserAccounts | null) => void,
  setIsLoading: (isLoading: boolean) => void,
  checkAndSetUserData: () => Promise<void>
) => {
  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.login(email, password);
      // After successful login, check auth state
      await checkAndSetUserData();
      toast.success('התחברת בהצלחה');
    } catch (error: any) {
      console.error('Login failed:', error);
      toast.error(`שגיאה בהתחברות: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.register(name, email, password);
      toast.success('נרשמת בהצלחה! בדוק את האימייל לאישור החשבון');
    } catch (error: any) {
      console.error('Registration failed:', error);
      toast.error(`שגיאה ברישום: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setAccount(null);
      setUserAccounts(null);
      toast.success('התנתקת בהצלחה');
    } catch (error: any) {
      console.error('Logout failed:', error);
      toast.error(`שגיאה בהתנתקות: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    login,
    register,
    logout
  };
};
