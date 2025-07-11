
import { supabase } from "@/integrations/supabase/client";
import { Account } from '../../types';
import { sharedAccountService } from './sharedAccountService';
import { ownedAccountService } from './ownedAccountService';
import { accountCreationService } from './accountCreationService';
import { memberService } from './memberService';

export const accountService = {
  // Get default account for a user using new member-based architecture
  getDefaultAccount: async (userId: string, userName: string): Promise<Account> => {
    try {
      console.log(`Getting default account for user ${userId} using member-based architecture`);
      
      // Get user's memberships
      const { data: memberships, error } = await supabase
        .from('account_members')
        .select(`
          account_id,
          role,
          accounts:account_id(id, name)
        `)
        .eq('user_id', userId)
        .order('role', { ascending: false }) // admins first
        .order('joined_at', { ascending: true }); // oldest first
      
      if (error) {
        console.error('Error getting user memberships:', error);
        throw error;
      }
      
      // If user has accounts, return the first one (prioritizing admin accounts)
      if (memberships && memberships.length > 0) {
        const membership = memberships[0];
        console.log('Found existing account membership:', membership);
        return {
          id: membership.accounts.id,
          name: membership.accounts.name,
          userRole: membership.role
        };
      }
      
      // Check if user has pending invitations and should skip account creation
      const pendingInvitations = localStorage.getItem('pendingInvitationsAfterRegistration');
      if (pendingInvitations) {
        const invitationData = JSON.parse(pendingInvitations);
        if (invitationData.skipAccountCreation) {
          console.log('User has pending invitations - skipping automatic account creation');
          throw new Error('User should accept invitations first - no personal account needed');
        }
      }
      
      // If no accounts found and no skip flag, create a new one
      console.log('No existing accounts found, creating new personal account');
      return await accountCreationService.createNewAccount(userId, userName);
    } catch (error) {
      console.error('Error getting default account:', error);
      throw error;
    }
  },
  
  // Get all accounts for a user using new member-based architecture
  getUserAccounts: async (userId: string) => {
    try {
      console.log(`Getting accounts for user ${userId} using member-based architecture`);
      
      // Get all user's memberships with account details
      const { data: memberships, error } = await supabase
        .from('account_members')
        .select(`
          account_id,
          role,
          joined_at,
          accounts:account_id(id, name)
        `)
        .eq('user_id', userId)
        .order('role', { ascending: false }) // admins first
        .order('joined_at', { ascending: true }); // oldest first
      
      if (error) {
        console.error('Error getting user memberships:', error);
        throw error;
      }
      
      if (!memberships) {
        return {
          ownedAccounts: [],
          sharedAccounts: []
        };
      }
      
      // Separate admin accounts (owned) from member accounts (shared)
      const adminAccounts: Account[] = [];
      const memberAccounts: Account[] = [];
      
      memberships.forEach(membership => {
        const account: Account = {
          id: membership.accounts.id,
          name: membership.accounts.name,
          userRole: membership.role
        };
        
        if (membership.role === 'admin') {
          adminAccounts.push(account);
        } else {
          memberAccounts.push(account);
        }
      });
      
      console.log(`Found ${adminAccounts.length} admin accounts and ${memberAccounts.length} member accounts`);
      
      return {
        ownedAccounts: adminAccounts,
        sharedAccounts: memberAccounts
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
export { memberService } from './memberService';
export * from './types';
