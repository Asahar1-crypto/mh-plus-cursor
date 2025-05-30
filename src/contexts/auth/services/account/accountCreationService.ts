
import { supabase } from "@/integrations/supabase/client";
import { Account } from '../../types';
import { isAccountRPCResponse } from './types';

export const accountCreationService = {
  // Create new account using RPC function with additional safeguards
  createNewAccount: async (userId: string, userName: string): Promise<Account> => {
    console.log('No accounts found, creating a new one with transaction');
    
    // First, do a final check to make sure no account exists
    // This is an extra safety check before calling the RPC
    const { data: existingAccounts, error: checkError } = await supabase
      .from('accounts')
      .select('id, name, owner_id')
      .eq('owner_id', userId)
      .limit(1);
    
    if (checkError) {
      console.error('Error checking for existing accounts before creation:', checkError);
      throw checkError;
    }
    
    // If we found an account in this final check, return it instead of creating
    if (existingAccounts && existingAccounts.length > 0) {
      console.log('Found existing account in final check, returning it:', existingAccounts[0]);
      return {
        id: existingAccounts[0].id,
        name: existingAccounts[0].name,
        ownerId: existingAccounts[0].owner_id
      };
    }
    
    // Use any type to bypass strict TypeScript checking for the RPC call
    const rpcResult = await (supabase.rpc as any)(
      'create_account_if_not_exists',
      { 
        user_id: userId,
        account_name: `${userName}'s Account`
      }
    );
    
    const { data, error: createError } = rpcResult;
    
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
  }
};
