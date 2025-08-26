import { supabase } from "@/integrations/supabase/client";
import { AccountMember } from '../../types';

/**
 * Service for managing account members
 */
export const memberService = {
  // Get all members of an account
  getAccountMembers: async (accountId: string): Promise<AccountMember[]> => {
    try {
      console.log(`Getting members for account ${accountId}`);
      
      // First get account members
      const { data: members, error: membersError } = await supabase
        .from('account_members')
        .select('user_id, role, joined_at')
        .eq('account_id', accountId);
      
      if (membersError) {
        console.error('Error getting account members:', membersError);
        throw membersError;
      }

      if (!members || members.length === 0) {
        return [];
      }

      // Then get names for all user IDs
      const userIds = members.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error getting profiles:', profilesError);
        // Continue without names if profiles fetch fails
      }

      // Combine the data
      return members.map(member => ({
        user_id: member.user_id,
        user_name: profiles?.find(p => p.id === member.user_id)?.name || 'משתמש לא ידוע',
        role: member.role,
        joined_at: member.joined_at
      }));
    } catch (error) {
      console.error('Error in getAccountMembers:', error);
      throw error;
    }
  },
  
  // Add a member to an account
  addMember: async (accountId: string, userId: string, role: 'admin' | 'member' = 'member'): Promise<boolean> => {
    try {
      console.log(`Adding member ${userId} to account ${accountId} with role ${role}`);
      
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
      console.log(`Removing member ${userId} from account ${accountId}`);
      
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