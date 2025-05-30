
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

  return {
    sendInvitation,
    removeInvitation,
    acceptInvitation,
    isSubmitting
  };
};
