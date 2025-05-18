
export * from './types';
export * from './sendInvitation';
export * from './removeInvitation';
export * from './acceptInvitation';
export * from './checkInvitation';
export * from './fetchInvitation';
export * from './pendingInvitations';

import { sendInvitation } from './sendInvitation';
import { removeInvitation } from './removeInvitation';
import { acceptInvitation } from './acceptInvitation';
import { checkInvitationById } from './checkInvitation';
import { checkPendingInvitations } from './pendingInvitations';

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
