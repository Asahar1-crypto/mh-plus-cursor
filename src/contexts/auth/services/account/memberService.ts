import { supabase } from "@/integrations/supabase/client";
import { AccountMember } from '../../types';

/**
 * Service for managing account members
 */
export const memberService = {
  // Get all members of an account
  getAccountMembers: async (accountId: string): Promise<AccountMember[]> => {
    try {
      
      const { data, error } = await supabase.rpc(
        'get_account_members_with_details',
        { account_uuid: accountId }
      );
      
      if (error) {
        console.error('Error getting account members:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getAccountMembers:', error);
      throw error;
    }
  },
  
  // Add a member to an account
  addMember: async (accountId: string, userId: string, role: 'admin' | 'member' = 'member'): Promise<boolean> => {
    try {
      
      const { data, error } = await supabase.rpc(
        'add_account_member',
        { 
          account_uuid: accountId, 
          user_uuid: userId, 
          member_role: role 
        }
      );
      
      if (error) {
        console.error('Error adding account member:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in addMember:', error);
      throw error;
    }
  },
  
  // Remove a member from an account
  removeMember: async (accountId: string, userId: string): Promise<boolean> => {
    try {
      
      const { data, error } = await supabase.rpc(
        'remove_account_member',
        { 
          account_uuid: accountId, 
          user_uuid: userId 
        }
      );
      
      if (error) {
        console.error('Error removing account member:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in removeMember:', error);
      throw error;
    }
  },
  
  // Get user's role in a specific account
  getUserRole: async (accountId: string, userId: string): Promise<'admin' | 'member' | null> => {
    try {
      const { data, error } = await supabase
        .from('account_members')
        .select('role')
        .eq('account_id', accountId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error getting user role:', error);
        throw error;
      }
      
      return data?.role || null;
    } catch (error) {
      console.error('Error in getUserRole:', error);
      throw error;
    }
  },
  
  // Check if user is admin of account
  isAdmin: async (accountId: string, userId: string): Promise<boolean> => {
    try {
      const role = await memberService.getUserRole(accountId, userId);
      return role === 'admin';
    } catch (error) {
      console.error('Error in isAdmin:', error);
      return false;
    }
  }
};