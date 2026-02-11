
import { supabase } from "@/integrations/supabase/client";
import { Account } from '../../types';

export const ownedAccountService = {
  // Get owned accounts where user is owner_id
  getOwnedAccounts: async (userId: string): Promise<Account | null> => {
    console.log(`Getting owned accounts for user ${userId}`);
    
    const { data: ownedAccounts, error: ownedError } = await supabase
      .from('accounts')
      .select('*, subscription_status, trial_ends_at, plan_slug, billing_period, billing_cycle_start_day')
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
          subscription_status: ownedAccounts[0].subscription_status,
          trial_ends_at: ownedAccounts[0].trial_ends_at,
          plan_slug: ownedAccounts[0].plan_slug,
          billing_period: ownedAccounts[0].billing_period,
          billing_cycle_start_day: ownedAccounts[0].billing_cycle_start_day,
          avatar_set: ownedAccounts[0].avatar_set,
          ownerId: ownedAccounts[0].owner_id,
          sharedWithId: sharedWithId,
          sharedWithEmail: sharedWithEmail,
          sharedWithName: sharedUserProfile?.name
        };
      }
      
      return {
        id: ownedAccounts[0].id,
        name: ownedAccounts[0].name,
        subscription_status: ownedAccounts[0].subscription_status,
        trial_ends_at: ownedAccounts[0].trial_ends_at,
        plan_slug: ownedAccounts[0].plan_slug,
        billing_period: ownedAccounts[0].billing_period,
        billing_cycle_start_day: ownedAccounts[0].billing_cycle_start_day,
        avatar_set: ownedAccounts[0].avatar_set,
        ownerId: ownedAccounts[0].owner_id,
        sharedWithEmail: sharedWithEmail
      };
    }
    
    return null;
  },

  // Get all accounts owned by the user
  getAllOwnedAccounts: async (userId: string) => {
    console.log(`Getting all owned accounts for user ${userId}`);
    
    const { data: ownedAccounts, error: ownedError } = await supabase
      .from('accounts')
      .select(`
        *,
        subscription_status,
        trial_ends_at,
        plan_slug,
        billing_period,
        billing_cycle_start_day,
        shared_profile:profiles!accounts_shared_with_id_fkey(name)
      `)
      .eq('owner_id', userId);
      
    if (ownedError) {
      console.error('Error getting owned accounts:', ownedError);
      throw ownedError;
    }
    
    // Transform owned accounts to include shared user info
    return ownedAccounts?.map(account => {
      return {
        id: account.id,
        name: account.name,
        subscription_status: account.subscription_status,
        trial_ends_at: account.trial_ends_at,
        plan_slug: account.plan_slug,
        billing_period: account.billing_period,
        billing_cycle_start_day: account.billing_cycle_start_day,
        avatar_set: account.avatar_set,
        ownerId: account.owner_id,
        sharedWithId: account.shared_with_id,
        sharedWithEmail: account.shared_with_email,
        sharedWithName: account.shared_profile?.name
      };
    }) || [];
  }
};
