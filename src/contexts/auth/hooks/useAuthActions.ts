
import { useState } from 'react';
import { toast } from 'sonner';
import { User, Account, UserAccounts } from '../types';
import { useAuthenticationActions } from './useAuthenticationActions';
import { useAccountActions } from './useAccountActions';
import { usePasswordActions } from './usePasswordActions';
import { authService } from '../authService';

export const useAuthActions = (
  user: User | null,
  account: Account | null,
  setUser: (user: User | null) => void,
  setAccount: (account: Account | null) => void,
  setUserAccounts: (userAccounts: UserAccounts | null) => void,
  setIsLoading: (isLoading: boolean) => void,
  checkAndSetUserData: (forceRefresh?: boolean) => Promise<void>
) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, register, logout } = useAuthenticationActions(
    setUser,
    setAccount,
    setUserAccounts,
    setIsLoading,
    checkAndSetUserData
  );

  const { switchAccount, updateAccountName } = useAccountActions(
    user,
    account,
    setAccount,
    setUserAccounts,
    setIsLoading
  );

  const { verifyEmail, resetPassword } = usePasswordActions(
    setIsLoading,
    checkAndSetUserData
  );

  // Invitation actions - inline implementation
  const sendInvitation = async (email: string): Promise<void> => {
    if (!user || !account) {
      toast.error('יש להתחבר כדי לשלוח הזמנה');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.sendInvitation(email, user, account);
      toast.success('ההזמנה נשלחה בהצלחה');
      // Force data refresh after successful invitation
      await checkAndSetUserData(true);
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
      await checkAndSetUserData(true); // Force refresh after removing invitation
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
      console.log('useAuthActions: Starting invitation acceptance for:', invitationId);
      
      const sharedAccount = await authService.acceptInvitation(invitationId, user);
      console.log('useAuthActions: Invitation accepted, shared account:', sharedAccount);
      
      // Refresh all user data to include the new shared account
      await checkAndSetUserData(true);
      console.log('useAuthActions: User data refreshed after accepting invitation');
      
      toast.success('הצטרפת לחשבון בהצלחה!');
      
      // Give a moment for the UI to update, then reload the page to ensure fresh state
      setTimeout(() => {
        console.log('useAuthActions: Reloading page to show shared account');
        window.location.reload();
      }, 1500);
      
    } catch (error: any) {
      console.error('useAuthActions: Failed to accept invitation:', error);
      toast.error(`שגיאה בקבלת ההזמנה: ${error.message}`);
    } finally {
      setIsSubmitting(false);
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
    switchAccount,
    updateAccountName,
    isSubmitting
  };
};
