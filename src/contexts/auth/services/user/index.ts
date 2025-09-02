
import { authenticationService } from './authenticationService';
import { registrationService } from './registrationService';
import { accountVerificationService } from './accountVerificationService';
import { invitationCheckService } from './invitationCheckService';
import { selectedAccountService } from './selectedAccountService';
import { User } from '../../types';
import { InvitationData } from '../invitation/types';

/**
 * Combined user service that re-exports functionality from specialized services
 */
export const userService = {
  // Authentication
  login: (email: string, password: string): Promise<User> => {
    return authenticationService.login(email, password);
  },
  
  logout: (): Promise<void> => {
    return authenticationService.logout();
  },

  // Registration
  register: (name: string, email: string, password: string) => {
    return registrationService.register(name, email, password);
  },

  // Verification & Recovery
  verifyEmail: (token: string, email?: string): Promise<boolean> => {
    return accountVerificationService.verifyEmail(token, email);
  },
  
  resetPassword: (email: string): Promise<void> => {
    return accountVerificationService.resetPassword(email);
  },

  // Invitation Checking
  checkPendingInvitations: (email: string): Promise<InvitationData[]> => {
    return invitationCheckService.checkPendingInvitations(email);
  },

  // Selected Account Management
  getSelectedAccountId: (userId: string): Promise<string | null> => {
    return selectedAccountService.getSelectedAccountId(userId);
  },

  setSelectedAccountId: (userId: string, accountId: string): Promise<void> => {
    return selectedAccountService.setSelectedAccountId(userId, accountId);
  }
};
