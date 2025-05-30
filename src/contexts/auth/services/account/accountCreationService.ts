
import { supabase } from "@/integrations/supabase/client";
import { Account } from '../../types';
import { isAccountRPCResponse } from './types';

export const accountCreationService = {
  // Create new account using RPC function with additional safeguards
  createNewAccount: async (userId: string, userName: string): Promise<Account> => {
    console.log('Creating new account for user:', userId, 'with name:', userName);
    
    // First, ensure the user profile exists
    console.log('Checking if user profile exists...');
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('id', userId)
      .maybeSingle();
    
    if (profileCheckError) {
      console.error('Error checking user profile:', profileCheckError);
      throw new Error(`Failed to check user profile: ${profileCheckError.message}`);
    }
    
    // If profile doesn't exist, create it
    if (!existingProfile) {
      console.log('User profile does not exist, creating it...');
      const { error: profileCreateError } = await supabase
        .from('profiles')
        .insert([
          {
            id: userId,
            name: userName
          }
        ]);
      
      if (profileCreateError) {
        console.error('Error creating user profile:', profileCreateError);
        throw new Error(`Failed to create user profile: ${profileCreateError.message}`);
      }
      
      console.log('User profile created successfully');
    } else {
      console.log('User profile already exists:', existingProfile);
    }
    
    // Now check for existing accounts after ensuring profile exists
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
    
    try {
      console.log('Calling RPC create_account_if_not_exists...');
      
      // Use the RPC function to create account safely
      const { data, error: createError } = await supabase.rpc(
        'create_account_if_not_exists',
        { 
          user_id: userId,
          account_name: `${userName}'s Account`
        }
      );
      
      if (createError) {
        console.error('RPC Error creating new account:', createError);
        throw createError;
      }
      
      if (!data) {
        throw new Error('No account data returned from account creation');
      }
      
      console.log('RPC returned data:', data);
      
      // Handle both single object and array responses
      const accountData = Array.isArray(data) ? data[0] : data;
      
      // Use type guard to ensure data is of the expected type
      if (!isAccountRPCResponse(accountData)) {
        console.error('Unexpected data format:', accountData);
        throw new Error('Unexpected data format returned from account creation');
      }
      
      console.log('Successfully created/retrieved account via RPC:', accountData);
      return {
        id: accountData.id,
        name: accountData.name,
        ownerId: accountData.owner_id
      };
    } catch (rpcError) {
      console.error('Failed to create account via RPC:', rpcError);
      
      // Fallback: try direct insert as last resort
      try {
        console.log('Attempting fallback direct insert...');
        const { data: insertData, error: insertError } = await supabase
          .from('accounts')
          .insert([
            {
              name: `${userName}'s Account`,
              owner_id: userId
            }
          ])
          .select('id, name, owner_id')
          .single();
        
        if (insertError) {
          console.error('Fallback insert also failed:', insertError);
          throw insertError;
        }
        
        console.log('Fallback insert succeeded:', insertData);
        return {
          id: insertData.id,
          name: insertData.name,
          ownerId: insertData.owner_id
        };
      } catch (fallbackError) {
        console.error('Both RPC and fallback insert failed:', fallbackError);
        throw new Error(`Failed to create account: ${rpcError.message || rpcError}`);
      }
    }
  }
};
