
import { supabase } from "@/integrations/supabase/client";
import { Account } from '../../types';
import { isAccountRPCResponse } from './types';

export const accountCreationService = {
  // Create new account using RPC function
  createNewAccount: async (userId: string, userName: string): Promise<Account> => {
    console.log('No accounts found, creating a new one with transaction');
    
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
