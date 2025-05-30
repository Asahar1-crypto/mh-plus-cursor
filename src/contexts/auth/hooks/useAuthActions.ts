
import { useState } from 'react';
import { toast } from 'sonner';
import { User, Account, UserAccounts } from '../types';
import { authService } from '../authService';

export const useAuthActions = (
  user: User | null,
  account: Account | null,
  setUser: (user: User | null) => void,
  setAccount: (account: Account | null) => void,
  setUserAccounts: (userAccounts: UserAccounts | null) => void,
  setIsLoading: (isLoading: boolean) => void,
  checkAndSetUserData: () => Promise<void>
) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const sendInvitation = async (email: string): Promise<void> => {
    if (!user || !account) {
      toast.error('יש להתחבר כדי לשלוח הזמנה');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.sendInvitation(email, user, account);
      toast.success('ההזמנה נשלחה בהצלחה');
    } catch (error: any) {
      console.error('Failed to send invitation:', error);
      toast.error(`שגיאה בשליחת ההזמנה: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeInvitation = async (): Promise<void> => {
    if (!account) {
      toast.error('לא נמצא חשבון פעיל');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.removeInvitation(account);
      await checkAndSetUserData(); // Refresh data after removing invitation
      toast.success('ההזמנה הוסרה בהצלחה');
    } catch (error: any) {
      console.error('Failed to remove invitation:', error);
      toast.error(`שגיאה בהסרת ההזמנה: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const acceptInvitation = async (invitationId: string): Promise<void> => {
    if (!user) {
      toast.error('יש להתחבר כדי לקבל הזמנה');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.acceptInvitation(invitationId, user);
      await checkAndSetUserData(); // Refresh data after accepting invitation
      toast.success('ההזמנה התקבלה בהצלחה');
    } catch (error: any) {
      console.error('Failed to accept invitation:', error);
      toast.error(`שגיאה בקבלת ההזמנה: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyEmail = async (token: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await authService.verifyEmail(token);
      if (result) {
        await checkAndSetUserData();
        toast.success('האימייל אומת בהצלחה');
      }
      return result;
    } catch (error: any) {
      console.error('Email verification failed:', error);
      toast.error(`שגיאה באימות האימייל: ${error.message}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.resetPassword(email);
      toast.success('נשלח אימייל לאיפוס סיסמה');
    } catch (error: any) {
      console.error('Password reset failed:', error);
      toast.error(`שגיאה באיפוס סיסמה: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const switchAccount = async (accountId: string): Promise<void> => {
    if (!user) {
      toast.error('יש להתחבר כדי לשנות חשבון');
      return;
    }

    setIsLoading(true);
    try {
      console.log(`Switching to account ${accountId} for user ${user.id}`);
      const result = await authService.switchAccount(user.id, accountId);
      
      // Update state immediately
      setAccount(result.account);
      setUserAccounts(result.userAccounts);
      
      console.log('Account switched successfully, new account:', result.account);
      toast.success(`עבר לחשבון: ${result.account.name}`);
      
      // Force a complete data refresh after a short delay to ensure the UI updates
      setTimeout(() => {
        checkAndSetUserData();
      }, 100);
    } catch (error: any) {
      console.error('Failed to switch account:', error);
      toast.error(`שגיאה במעבר בין חשבונות: ${error.message}`);
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
    resetPassword,
    switchAccount
  };
};
