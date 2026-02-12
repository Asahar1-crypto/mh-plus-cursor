
import { supabase } from "@/integrations/supabase/client";
import { Account } from '../../types';
import { isAccountRPCResponse } from './types';

export const accountCreationService = {
  // Create new account using new member-based architecture
  createNewAccount: async (userId: string, userName: string): Promise<Account> => {
    // First, ensure the user profile exists
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
      
    }
    
    // Check for existing accounts where user is a member
    const { data: existingMemberships, error: membershipError } = await supabase
      .from('account_members')
      .select(`
        account_id,
        role,
        accounts:account_id(id, name)
      `)
      .eq('user_id', userId)
      .eq('role', 'admin')
      .limit(1);
    
    if (membershipError) {
      console.error('Error checking for existing memberships:', membershipError);
      throw membershipError;
    }
    
    // If user is already admin of an account, return it
    if (existingMemberships && existingMemberships.length > 0) {
      const membership = existingMemberships[0];
      return {
        id: membership.accounts.id,
        name: membership.accounts.name,
        userRole: 'admin'
      };
    }
    
    try {
      // Use the new RPC function to create account with admin
      const { data, error: createError } = await supabase.rpc(
        'create_account_with_admin',
        { 
          account_name: `${userName}'s Family Account`,
          admin_user_id: userId
        }
      );
      
      if (createError) {
        console.error('RPC Error creating new account:', createError);
        throw createError;
      }
      
      if (!data || data.length === 0) {
        throw new Error('No account data returned from account creation');
      }
      
      const accountData = Array.isArray(data) ? data[0] : data;
      
      return {
        id: accountData.id,
        name: accountData.name,
        userRole: 'admin'
      };
    } catch (error) {
      console.error('Failed to create account:', error);
      throw new Error(`Failed to create account: ${error.message || error}`);
    }
  }
};
