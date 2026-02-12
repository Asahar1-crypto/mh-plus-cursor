import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { acceptInvitation } from './acceptInvitation';
import { Account, User } from '../../types';

/**
 * Automatically accept all pending invitations stored during registration
 */
export const autoAcceptRegistrationInvitations = async (user: User): Promise<Account[]> => {
  try {
    // Get pending invitations data from localStorage
    const pendingInvitationsData = localStorage.getItem('pendingInvitationsAfterRegistration');
    
    if (!pendingInvitationsData) {
      return [];
    }
    
    const invitationData = JSON.parse(pendingInvitationsData);
    
    if (!invitationData.invitations || invitationData.invitations.length === 0) {
      localStorage.removeItem('pendingInvitationsAfterRegistration');
      return [];
    }
    
    const acceptedAccounts: Account[] = [];
    
    // Accept each invitation
    for (const invitation of invitationData.invitations) {
      try {
        const account = await acceptInvitation(invitation.invitationId, user);
        if (account) {
          acceptedAccounts.push(account);
        }
      } catch (error) {
        console.error(`autoAcceptRegistrationInvitations: Failed to accept invitation ${invitation.invitationId}:`, error);
        // Continue with other invitations even if one fails
      }
    }
    
    // Clear the pending invitations data
    localStorage.removeItem('pendingInvitationsAfterRegistration');
    
    if (acceptedAccounts.length > 0) {
      toast.success(`הצטרפת בהצלחה ל-${acceptedAccounts.length} חשבונות!`);
    }
    
    return acceptedAccounts;
  } catch (error) {
    console.error('autoAcceptRegistrationInvitations: Error during auto-acceptance:', error);
    
    // Clear the data to prevent repeated attempts
    localStorage.removeItem('pendingInvitationsAfterRegistration');
    
    toast.error('שגיאה בקבלת ההזמנות אוטומטית. אנא בדוק את ההזמנות שלך.');
    return [];
  }
};

/**
 * Check if user has pending invitations from registration
 */
export const hasPendingRegistrationInvitations = (): boolean => {
  const pendingInvitationsData = localStorage.getItem('pendingInvitationsAfterRegistration');
  if (!pendingInvitationsData) return false;
  
  try {
    const invitationData = JSON.parse(pendingInvitationsData);
    return invitationData.invitations && invitationData.invitations.length > 0;
  } catch {
    return false;
  }
};