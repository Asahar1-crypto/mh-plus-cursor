
import { User, Account, UserAccounts } from './types';
import { checkAuth } from './services/authState';
import { login, register, logout, verifyEmail, resetPassword } from './services/authentication';
import { invitationService } from './services/invitationService';
import { userService } from './services/user';
import { accountService } from './services/accountService';

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
  resetPassword,

  // Switch active account function
  switchAccount: async (userId: string, accountId: string): Promise<{ account: Account, userAccounts: UserAccounts }> => {
    // Save user preference
    await userService.setSelectedAccountId(userId, accountId);
    
    // Get updated accounts and find the selected one
    const userAccounts = await accountService.getUserAccounts(userId);
    const allAccounts = [...userAccounts.ownedAccounts, ...userAccounts.sharedAccounts];
    const selectedAccount = allAccounts.find(acc => acc.id === accountId);
    
    if (!selectedAccount) {
      throw new Error('Selected account not found');
    }
    
    return { account: selectedAccount, userAccounts };
  },

  // Update account name function
  updateAccountName: async (accountId: string, newName: string): Promise<Account> => {
    const updatedAccount = await accountService.updateAccountName(accountId, newName);
    
    return updatedAccount;
  }
};
