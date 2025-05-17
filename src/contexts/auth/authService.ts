
import { User, Account } from './types';
import { checkAuth } from './services/authState';
import { login, register, logout, verifyEmail, resetPassword } from './services/authentication';
import { invitationService } from './services/invitationService';

export const authService = {
  // Check for saved session
  checkAuth,

  // Login function
  login,

  // Register function
  register,

  // Logout function
  logout,

  // Send invitation function - delegate to invitationService
  sendInvitation: async (email: string, user: User, account: Account) => {
    return invitationService.sendInvitation(email, user, account);
  },

  // Remove invitation function - delegate to invitationService
  removeInvitation: async (account: Account) => {
    return invitationService.removeInvitation(account);
  },

  // Accept invitation function - delegate to invitationService
  acceptInvitation: async (invitationId: string, user: User) => {
    return invitationService.acceptInvitation(invitationId, user);
  },

  // Verify email function
  verifyEmail,

  // Reset password function
  resetPassword
};
