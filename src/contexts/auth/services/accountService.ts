
import { supabase } from "@/integrations/supabase/client";
import { User, Account } from '../types';
import { toast } from 'sonner';

/**
 * Service for account-related operations
 */
export const accountService = {
  // Fetch accounts for a user
  getUserAccounts: async (userId: string): Promise<{ownedAccounts: any[], sharedAccounts: any[]}> => {
    try {
      console.log(`Fetching accounts for user ${userId}`);
      
      // Check if the user has an account as owner
      const { data: ownedAccounts, error: ownedAccountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('owner_id', userId);
        
      if (ownedAccountsError) {
        console.error("Error fetching owned accounts:", ownedAccountsError);
        throw ownedAccountsError;
      }
      
      // Check if user is shared with any account
      const { data: sharedAccounts, error: sharedAccountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('shared_with_id', userId);
        
      if (sharedAccountsError) {
        console.error("Error fetching shared accounts:", sharedAccountsError);
        throw sharedAccountsError;
      }
      
      console.log(`Found ${ownedAccounts?.length || 0} owned accounts and ${sharedAccounts?.length || 0} shared accounts`);
      
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
      console.log(`Creating account "${name}" for user ${ownerId}`);
      
      const { data, error } = await supabase
        .from('accounts')
        .insert({
          name: name,
          owner_id: ownerId
        })
        .select()
        .single();
        
      if (error) {
        console.error("Error creating account:", error);
        throw error;
      }
      
      if (!data) {
        console.error("No data returned after creating account");
        throw new Error('No data returned after creating account');
      }
      
      console.log("Account created successfully:", data);
      
      return {
        id: data.id,
        name: data.name,
        ownerId: data.owner_id,
        sharedWithId: data.shared_with_id,
        sharedWithEmail: data.shared_with_email,
        invitationId: data.invitation_id
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
      console.log(`Getting default account for user ${userId}`);
      
      const { ownedAccounts, sharedAccounts } = await accountService.getUserAccounts(userId);
      
      // Prioritize accounts: owned > shared > create new
      if (ownedAccounts && ownedAccounts.length > 0) {
        const account = ownedAccounts[0];
        console.log("Using first owned account as default:", account);
        
        return {
          id: account.id,
          name: account.name,
          ownerId: account.owner_id,
          sharedWithId: account.shared_with_id,
          sharedWithEmail: account.shared_with_email,
          invitationId: account.invitation_id
        };
      } 
      
      if (sharedAccounts && sharedAccounts.length > 0) {
        const account = sharedAccounts[0];
        console.log("Using first shared account as default:", account);
        
        return {
          id: account.id,
          name: account.name,
          ownerId: account.owner_id,
          sharedWithId: account.shared_with_id || userId, // If missing, use current user ID
          sharedWithEmail: account.shared_with_email,
          invitationId: account.invitation_id
        };
      }
      
      // Create a new account
      console.log("No existing accounts found, creating new account");
      return await accountService.createAccount(`משפחת ${userName}`, userId);
    } catch (error) {
      console.error('Failed to get default account:', error);
      
      // Return a temporary account object as fallback
      console.log("Returning temporary fallback account");
      return {
        id: `account-${userId}`,
        name: `משפחת ${userName}`,
        ownerId: userId
      };
    }
  }
};
