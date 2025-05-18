
/**
 * Consolidated invitation service that encapsulates all invitation-related operations
 */

import { User, Account } from '../types';
import { sendInvitation } from './invitation/sendInvitation';
import { removeInvitation } from './invitation/removeInvitation';
import { acceptInvitation } from './invitation/acceptInvitation';
import { checkInvitationById } from './invitation/invitationValidator';
import { checkPendingInvitations } from './invitation/invitationChecker';

export const invitationService = {
  /**
   * Send an invitation to a user to join an account
   */
  sendInvitation: async (email: string, user: User, account: Account) => {
    return sendInvitation(email, user, account);
  },
  
  /**
   * Remove an invitation and clear sharing information from an account
   */
  removeInvitation: async (account: Account) => {
    return removeInvitation(account);
  },
  
  /**
   * Accept an invitation to join a shared account
   */
  acceptInvitation: async (invitationId: string, user: User) => {
    return acceptInvitation(invitationId, user);
  },
  
  /**
   * Check if an invitation exists by ID
   */
  checkInvitationById: async (invitationId: string) => {
    return checkInvitationById(invitationId);
  },
  
  /**
   * Check for pending invitations for a user's email
   */
  checkPendingInvitations: async (email: string) => {
    return checkPendingInvitations(email);
  }
};
