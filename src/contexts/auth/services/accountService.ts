
import { supabase } from "@/integrations/supabase/client";
import { Account } from '../types';

export const accountService = {
  // Get default account for a user
  getDefaultAccount: async (userId: string, userName: string): Promise<Account> => {
    try {
      console.log(`Getting default account for user ${userId}`);
      
      // First try to find an existing account where user is owner
      const { data: ownedAccounts, error: ownedError } = await supabase
        .from('accounts')
        .select('*')
        .eq('owner_id', userId)
        .limit(1);
        
      if (ownedError) {
        console.error('Error getting owned accounts:', ownedError);
        throw ownedError;
      }
      
      // If user has an owned account, return it
      if (ownedAccounts && ownedAccounts.length > 0) {
        console.log('Found existing owned account:', ownedAccounts[0]);
        return {
          id: ownedAccounts[0].id,
          name: ownedAccounts[0].name,
          ownerId: ownedAccounts[0].owner_id
        };
      }
      
      // If no owned account, check for shared accounts
      const { data: sharedAccounts, error: sharedError } = await supabase
        .from('accounts')
        .select('*')
        .eq('shared_with_id', userId)
        .limit(1);
        
      if (sharedError) {
        console.error('Error getting shared accounts:', sharedError);
        throw sharedError;
      }
      
      // If user has a shared account, return it
      if (sharedAccounts && sharedAccounts.length > 0) {
        console.log('Found existing shared account:', sharedAccounts[0]);
        return {
          id: sharedAccounts[0].id,
          name: sharedAccounts[0].name,
          ownerId: sharedAccounts[0].owner_id,
          sharedWithId: userId
        };
      }
      
      // If no accounts found, create a new one for the user
      console.log('No accounts found, creating a new one');
      const { data: newAccount, error: createError } = await supabase
        .from('accounts')
        .insert({
          name: `${userName}'s Account`,
          owner_id: userId
        })
        .select('*')
        .single();
        
      if (createError) {
        console.error('Error creating new account:', createError);
        throw createError;
      }
      
      console.log('Created new account:', newAccount);
      return {
        id: newAccount.id,
        name: newAccount.name,
        ownerId: newAccount.owner_id
      };
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
      const { data: ownedAccounts, error: ownedError } = await supabase
        .from('accounts')
        .select('*')
        .eq('owner_id', userId);
        
      if (ownedError) {
        console.error('Error getting owned accounts:', ownedError);
        throw ownedError;
      }
      
      // Get accounts shared with the user
      const { data: sharedAccounts, error: sharedError } = await supabase
        .from('accounts')
        .select('*')
        .eq('shared_with_id', userId);
        
      if (sharedError) {
        console.error('Error getting shared accounts:', sharedError);
        throw sharedError;
      }
      
      console.log(`Found ${ownedAccounts?.length || 0} owned accounts and ${sharedAccounts?.length || 0} shared accounts`);
      return {
        ownedAccounts: ownedAccounts || [],
        sharedAccounts: sharedAccounts || []
      };
    } catch (error) {
      console.error('Error getting user accounts:', error);
      throw error;
    }
  }
};
