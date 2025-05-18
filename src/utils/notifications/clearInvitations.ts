
import { toast } from 'sonner';

/**
 * Utility function to clear all pending invitation data from sessionStorage
 */
export const clearAllPendingInvitations = () => {
  try {
    console.log('Cleaning up all pending invitation data from sessionStorage');
    
    // Clear invitation-related data
    sessionStorage.removeItem('pendingInvitationId');
    sessionStorage.removeItem('pendingInvitationAccountId');
    sessionStorage.removeItem('pendingInvitationOwnerId');
    sessionStorage.removeItem('notifiedInvitations');
    sessionStorage.removeItem('currentInvitationDetails');
    sessionStorage.removeItem('pendingInvitationsAfterRegistration');
    
    console.log('All invitation data cleared from sessionStorage');
  } catch (error) {
    console.error('Error clearing invitation data:', error);
    toast.error('שגיאה בניקוי נתוני ההזמנות');
  }
};

/**
 * Upgrade the existing debug utilities exports to include the new function
 */
export * from './debugUtils';
export { clearAllPendingInvitations };
