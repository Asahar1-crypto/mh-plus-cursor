
import { supabase } from "@/integrations/supabase/client";
import { Account } from '../types';

// Define the AccountRPCResponse interface properly
interface AccountRPCResponse {
  id: string;
  name: string;
  owner_id: string;
}

// Type guard to verify if the response is AccountRPCResponse
function isAccountRPCResponse(obj: any): obj is AccountRPCResponse {
  return (
    obj &&
    typeof obj === 'object' &&
    'id' in obj &&
    'name' in obj &&
    'owner_id' in obj
  );
}

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
        
        // Get shared user information if exists
        let sharedWithEmail = ownedAccounts[0].shared_with_email;
        let sharedWithId = ownedAccounts[0].shared_with_id;
        
        if (sharedWithId) {
          // Get shared user details from profiles
          const { data: sharedUserProfile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', sharedWithId)
            .single();
            
          console.log('Shared user profile:', sharedUserProfile);
          
          return {
            id: ownedAccounts[0].id,
            name: ownedAccounts[0].name,
            ownerId: ownedAccounts[0].owner_id,
            sharedWithId: sharedWithId,
            sharedWithEmail: sharedWithEmail,
            sharedWithName: sharedUserProfile?.name
          };
        }
        
        return {
          id: ownedAccounts[0].id,
          name: ownedAccounts[0].name,
          ownerId: ownedAccounts[0].owner_id,
          sharedWithEmail: sharedWithEmail
        };
      }
      
      // If no owned account, check for shared accounts
      const { data: sharedAccounts, error: sharedError } = await supabase
        .from('accounts')
        .select(`
          *,
          owner_profile:profiles!accounts_owner_id_fkey(name)
        `)
        .eq('shared_with_id', userId)
        .limit(1);
        
      if (sharedError) {
        console.error('Error getting shared accounts:', sharedError);
        throw sharedError;
      }
      
      // If user has a shared account, return it
      if (sharedAccounts && sharedAccounts.length > 0) {
        console.log('Found existing shared account:', sharedAccounts[0]);
        
        // Get owner name from joined profile data
        const ownerName = sharedAccounts[0]?.owner_profile?.name;
        
        return {
          id: sharedAccounts[0].id,
          name: sharedAccounts[0].name,
          ownerId: sharedAccounts[0].owner_id,
          ownerName: ownerName, 
          sharedWithId: userId,
          sharedWithEmail: sharedAccounts[0].shared_with_email,
          isSharedAccount: true
        };
      }
      
      // If no accounts found, use transaction to safely create a new one
      console.log('No accounts found, creating a new one with transaction');
      
      // Fixed RPC call with proper generic typing
      const { data, error: createError } = await supabase.rpc<AccountRPCResponse, { 
        user_id: string; 
        account_name: string; 
      }>(
        'create_account_if_not_exists',
        { 
          user_id: userId,
          account_name: `${userName}'s Account`
        }
      );
      
      if (createError) {
        console.error('Error creating new account:', createError);
        throw createError;
      }
      
      if (!data) {
        throw new Error('No account data returned from account creation');
      }
      
      // Use type guard to ensure data is of the expected type
      if (!isAccountRPCResponse(data)) {
        throw new Error('Unexpected data format returned from account creation');
      }
      
      console.log('Created or retrieved account via transaction:', data);
      return {
        id: data.id,
        name: data.name,
        ownerId: data.owner_id
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
        .select(`
          *,
          shared_profile:profiles!accounts_shared_with_id_fkey(name)
        `)
        .eq('owner_id', userId);
        
      if (ownedError) {
        console.error('Error getting owned accounts:', ownedError);
        throw ownedError;
      }
      
      // Get accounts shared with the user
      const { data: sharedAccounts, error: sharedError } = await supabase
        .from('accounts')
        .select(`
          *,
          owner_profile:profiles!accounts_owner_id_fkey(name)
        `)
        .eq('shared_with_id', userId);
        
      if (sharedError) {
        console.error('Error getting shared accounts:', sharedError);
        throw sharedError;
      }
      
      // Transform owned accounts to include shared user info
      const enrichedOwnedAccounts = ownedAccounts?.map(account => {
        return {
          id: account.id,
          name: account.name,
          ownerId: account.owner_id,
          sharedWithId: account.shared_with_id,
          sharedWithEmail: account.shared_with_email,
          sharedWithName: account.shared_profile?.name
        };
      }) || [];
      
      // Transform shared accounts to include owner info
      const enrichedSharedAccounts = sharedAccounts?.map(account => {
        return {
          id: account.id,
          name: account.name,
          ownerId: account.owner_id,
          ownerName: account.owner_profile?.name,
          sharedWithId: userId,
          sharedWithEmail: account.shared_with_email,
          isSharedAccount: true
        };
      }) || [];
      
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
