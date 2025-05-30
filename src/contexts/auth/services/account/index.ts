
import { Account } from '../../types';
import { sharedAccountService } from './sharedAccountService';
import { ownedAccountService } from './ownedAccountService';
import { accountCreationService } from './accountCreationService';

export const accountService = {
  // Get default account for a user
  getDefaultAccount: async (userId: string, userName: string): Promise<Account> => {
    try {
      console.log(`Getting default account for user ${userId}`);
      
      // First check for shared accounts (accounts where user is shared_with_id)
      const sharedAccount = await sharedAccountService.getSharedAccounts(userId);
      if (sharedAccount) {
        return sharedAccount;
      }
      
      // If no shared account, try to find an existing account where user is owner
      const ownedAccount = await ownedAccountService.getOwnedAccounts(userId);
      if (ownedAccount) {
        return ownedAccount;
      }
      
      // If no accounts found, create a new one
      return await accountCreationService.createNewAccount(userId, userName);
    } catch (error) {
      console.error('Error getting default account:', error);
      throw error;
    }
  },
  
  // Get all accounts for a user (both owned and shared)
  getUserAccounts: async (userId: string) => {
    try {
      console.log(`Getting accounts for user ${userId}`);
      
      // Get accounts owned by the user
      const enrichedOwnedAccounts = await ownedAccountService.getAllOwnedAccounts(userId);
      
      // Get accounts shared with the user
      const enrichedSharedAccounts = await sharedAccountService.getAllSharedAccounts(userId);
      
      console.log(`Found ${enrichedOwnedAccounts.length || 0} owned accounts and ${enrichedSharedAccounts.length || 0} shared accounts`);
      
      return {
        ownedAccounts: enrichedOwnedAccounts,
        sharedAccounts: enrichedSharedAccounts
      };
    } catch (error) {
      console.error('Error getting user accounts:', error);
      throw error;
    }
  }
};

// Export individual services for direct use if needed
export { sharedAccountService } from './sharedAccountService';
export { ownedAccountService } from './ownedAccountService';
export { accountCreationService } from './accountCreationService';
export * from './types';
