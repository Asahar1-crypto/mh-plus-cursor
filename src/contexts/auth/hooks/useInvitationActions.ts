
import { useState } from 'react';
import { toast } from 'sonner';
import { User, Account } from '../types';
import { authService } from '../authService';

export const useInvitationActions = (
  user: User | null,
  account: Account | null,
  checkAndSetUserData: () => Promise<void>
) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      console.log('useInvitationActions: Starting invitation acceptance for:', invitationId);
      
      const sharedAccount = await authService.acceptInvitation(invitationId, user);
      console.log('useInvitationActions: Invitation accepted, shared account:', sharedAccount);
      
      // Refresh all user data to include the new shared account
      await checkAndSetUserData();
      console.log('useInvitationActions: User data refreshed after accepting invitation');
      
      toast.success('הצטרפת לחשבון בהצלחה!');
      
      // Give a moment for the UI to update, then reload the page to ensure fresh state
      setTimeout(() => {
        console.log('useInvitationActions: Reloading page to show shared account');
        window.location.reload();
      }, 1500);
      
    } catch (error: any) {
      console.error('useInvitationActions: Failed to accept invitation:', error);
      toast.error(`שגיאה בקבלת ההזמנה: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    sendInvitation,
    removeInvitation,
    acceptInvitation,
    isSubmitting
  };
};
