
export * from './types';
export * from './sendInvitation';
export * from './removeInvitation';
export * from './acceptInvitation';
export * from './invitationValidator';
export * from './invitationFetcher';
export * from './accountFetcher';
export * from './profileFetcher';
export * from './invitationCleaner';
export * from './invitationEnhancer';
export * from './invitationChecker';

import { sendInvitation } from './sendInvitation';
import { removeInvitation } from './removeInvitation';
import { acceptInvitation } from './acceptInvitation';
import { checkInvitationById } from './invitationValidator';
import { checkPendingInvitations } from './invitationChecker';

/**
 * Service for invitation-related operations
 */
export const invitationService = {
  sendInvitation,
  removeInvitation,
  acceptInvitation,
  checkInvitationById,
  checkPendingInvitations
};
