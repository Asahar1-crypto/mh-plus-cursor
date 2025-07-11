import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { acceptInvitation } from './acceptInvitation';
import { Account, User } from '../../types';

/**
 * Automatically accept all pending invitations stored during registration
 */
export const autoAcceptRegistrationInvitations = async (user: User): Promise<Account[]> => {
  console.log('autoAcceptRegistrationInvitations: Starting auto-acceptance for user', user.id);
  
  try {
    // Get pending invitations data from localStorage
    const pendingInvitationsData = localStorage.getItem('pendingInvitationsAfterRegistration');
    
    if (!pendingInvitationsData) {
      console.log('autoAcceptRegistrationInvitations: No pending invitations found');
      return [];
    }
    
    const invitationData = JSON.parse(pendingInvitationsData);
    console.log('autoAcceptRegistrationInvitations: Found invitation data:', invitationData);
    
    if (!invitationData.invitations || invitationData.invitations.length === 0) {
      console.log('autoAcceptRegistrationInvitations: No invitations in data');
      localStorage.removeItem('pendingInvitationsAfterRegistration');
      return [];
    }
    
    const acceptedAccounts: Account[] = [];
    
    // Accept each invitation
    for (const invitation of invitationData.invitations) {
      try {
        console.log(`autoAcceptRegistrationInvitations: Accepting invitation ${invitation.invitationId}`);
        
        const account = await acceptInvitation(invitation.invitationId, user);
        if (account) {
          acceptedAccounts.push(account);
          console.log(`autoAcceptRegistrationInvitations: Successfully accepted invitation for account ${account.name}`);
        }
      } catch (error) {
        console.error(`autoAcceptRegistrationInvitations: Failed to accept invitation ${invitation.invitationId}:`, error);
        // Continue with other invitations even if one fails
      }
    }
    
    // Clear the pending invitations data
    localStorage.removeItem('pendingInvitationsAfterRegistration');
    console.log('autoAcceptRegistrationInvitations: Cleared pending invitations data');
    
    if (acceptedAccounts.length > 0) {
      toast.success(`הצטרפת בהצלחה ל-${acceptedAccounts.length} חשבונות!`);
      console.log(`autoAcceptRegistrationInvitations: Successfully accepted ${acceptedAccounts.length} invitations`);
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