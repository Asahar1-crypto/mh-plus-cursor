
import { toast } from 'sonner';
import { checkPendingInvitations } from '../invitation/invitationChecker';
import { checkInvitationById } from '../invitation/invitationValidator';
import { InvitationData } from '../invitation/types';

/**
 * Service for checking pending invitations for a user
 */
export const invitationCheckService = {
  // Check for pending invitations for a user
  checkPendingInvitations: async (email: string): Promise<InvitationData[]> => {
    return checkPendingInvitations(email);
  },
  
  // Debug helper - directly check if an invitation exists by ID
  checkInvitationById: async (invitationId: string): Promise<boolean> => {
    return checkInvitationById(invitationId);
  }
};
