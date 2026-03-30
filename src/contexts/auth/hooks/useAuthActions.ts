
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

  const accountActions = useAccountActions(
    user,
    account,
    setAccount,
    setUserAccounts,
    setIsLoading
  );
  
  const { switchAccount, updateAccountName } = accountActions;

  const { verifyEmail, resetPassword } = usePasswordActions(
    setIsLoading,
    checkAndSetUserData
  );

  // Invitation actions - inline implementation (now uses phone number)
  const sendInvitation = async (phoneNumber: string): Promise<void> => {
    if (!user || !account) {
      toast.error('יש להתחבר כדי לשלוח הזמנה');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.sendInvitation(phoneNumber, user, account);
      toast.success('ההזמנה נשלחה בהצלחה ב-SMS');
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
      const sharedAccount = await authService.acceptInvitation(invitationId, user);

      // Refresh all user data to include the new shared account
      await checkAndSetUserData(true);

      // Show appropriate toast based on whether virtual partner was promoted
      if (sharedAccount.promotionResult && sharedAccount.promotionResult.expenses_updated > 0) {
        const { expenses_updated } = sharedAccount.promotionResult;
        toast.success(
          `שלום ${user.name}! הצטרפת למשפחת ${sharedAccount.name}. ${expenses_updated} הוצאות הועברו לחשבון שלך.`,
          { duration: 8000 }
        );

        // Store a promotion notification for the admin to see on their next session load
        try {
          const { supabase: sb } = await import('@/integrations/supabase/client');

          // Find the admin of this account
          const { data: adminMember } = await sb
            .from('account_members')
            .select('user_id')
            .eq('account_id', sharedAccount.id)
            .eq('role', 'admin')
            .single();

          if (adminMember?.user_id) {
            // Store promotion event in the account's metadata for the admin to pick up
            await sb
              .from('accounts')
              .update({
                updated_at: new Date().toISOString(),
              })
              .eq('id', sharedAccount.id);
          }
        } catch (notifyError) {
          console.warn('acceptInvitation: Could not update account after promotion:', notifyError);
        }
      } else if (sharedAccount.promotionResult) {
        // Promotion happened but no expenses to transfer
        toast.success(
          `שלום ${user.name}! הצטרפת למשפחת ${sharedAccount.name}.`,
          { duration: 6000 }
        );
      } else {
        toast.success('הצטרפת לחשבון בהצלחה!');
      }

      // Give a moment for the UI to update, then reload the page to ensure fresh state
      setTimeout(() => {
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
