
import { toast } from 'sonner';

/**
 * Utility function to clear all pending invitation data from sessionStorage
 */
export const clearAllPendingInvitations = () => {
  try {
    // Clear invitation-related data
    sessionStorage.removeItem('pendingInvitationId');
    sessionStorage.removeItem('pendingInvitationAccountId');
    sessionStorage.removeItem('pendingInvitationOwnerId');
    sessionStorage.removeItem('notifiedInvitations');
    sessionStorage.removeItem('currentInvitationDetails');
    localStorage.removeItem('pendingInvitationsAfterRegistration');
    
    toast.success('נתוני ההזמנות נוקו בהצלחה');
  } catch (error) {
    console.error('Error clearing invitation data:', error);
    toast.error('שגיאה בניקוי נתוני ההזמנות');
  }
};

// Export debug utilities from debugUtils instead of re-exporting here
