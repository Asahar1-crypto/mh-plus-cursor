
export * from './types';
export * from './sendInvitation';
export * from './removeInvitation';
export * from './acceptInvitation';

import { sendInvitation } from './sendInvitation';
import { removeInvitation } from './removeInvitation';
import { acceptInvitation } from './acceptInvitation';

/**
 * Service for invitation-related operations
 */
export const invitationService = {
  sendInvitation,
  removeInvitation,
  acceptInvitation,
};
