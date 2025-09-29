
import { toast } from 'sonner';
import { authService } from '../authService';

export const usePasswordActions = (
  setIsLoading: (isLoading: boolean) => void,
  checkAndSetUserData: (forceRefresh?: boolean) => Promise<void>
) => {
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
    console.log('🔥 usePasswordActions resetPassword called with:', email);
    console.log('🔥 authService.resetPassword function exists:', !!authService.resetPassword);
    console.log('🔥 Current domain:', window.location.origin);
    console.log('🔥 Redirect URL will be:', `${window.location.origin}/reset-password`);
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

  return {
    verifyEmail,
    resetPassword
  };
};
