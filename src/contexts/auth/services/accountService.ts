
import { supabase } from "@/integrations/supabase/client";
import { User, Account } from '../types';
import { toast } from 'sonner';
import { sendInvitationEmail } from '@/utils/emailService';

/**
 * Service for account-related operations
 */
export const accountService = {
  // Fetch accounts for a user
  getUserAccounts: async (userId: string): Promise<{ownedAccounts: any[], sharedAccounts: any[]}> => {
    try {
      // Check if the user has an account as owner
      const { data: ownedAccounts, error: ownedAccountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('owner_id', userId);
        
      if (ownedAccountsError) throw ownedAccountsError;
      
      // Check if user is shared with any account
      const { data: sharedAccounts, error: sharedAccountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('shared_with_id', userId);
        
      if (sharedAccountsError) throw sharedAccountsError;
      
      return { 
        ownedAccounts: ownedAccounts || [], 
        sharedAccounts: sharedAccounts || [] 
      };
    } catch (error) {
      console.error('Error fetching user accounts:', error);
      return { ownedAccounts: [], sharedAccounts: [] };
    }
  },

  // Create a new account
  createAccount: async (name: string, ownerId: string): Promise<Account | null> => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .insert({
          name: name,
          owner_id: ownerId
        })
        .select()
        .single();
        
      if (error) throw error;
      
      if (!data) throw new Error('No data returned after creating account');
      
      return {
        id: data.id,
        name: data.name,
        ownerId: data.owner_id,
        sharedWithId: data.shared_with_id
      };
    } catch (error) {
      console.error('Failed to create account:', error);
      toast.error('יצירת החשבון נכשלה, אנא נסה שוב');
      return null;
    }
  },

  // Get default account for a user
  getDefaultAccount: async (userId: string, userName: string): Promise<Account | null> => {
    try {
      const { ownedAccounts, sharedAccounts } = await accountService.getUserAccounts(userId);
      
      // Prioritize accounts: owned > shared > create new
      if (ownedAccounts && ownedAccounts.length > 0) {
        const account = ownedAccounts[0];
        return {
          id: account.id,
          name: account.name,
          ownerId: account.owner_id,
          sharedWithId: account.shared_with_id
        };
      } 
      
      if (sharedAccounts && sharedAccounts.length > 0) {
        const account = sharedAccounts[0];
        return {
          id: account.id,
          name: account.name,
          ownerId: account.owner_id,
          sharedWithId: account.shared_with_id
        };
      }
      
      // Create a new account
      return await accountService.createAccount(`משפחת ${userName}`, userId);
    } catch (error) {
      console.error('Failed to get default account:', error);
      
      // Return a temporary account object as fallback
      return {
        id: `account-${userId}`,
        name: `משפחת ${userName}`,
        ownerId: userId
      };
    }
  }
};
