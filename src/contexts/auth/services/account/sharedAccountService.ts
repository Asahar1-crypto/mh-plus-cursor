
import { supabase } from "@/integrations/supabase/client";
import { Account } from '../../types';

export const sharedAccountService = {
  // Get shared accounts where user is shared_with_id
  getSharedAccounts: async (userId: string): Promise<Account | null> => {
    
    const { data: sharedAccounts, error: sharedError } = await supabase
      .from('accounts')
      .select(`
        *,
        subscription_status,
        trial_ends_at,
        plan_slug,
        billing_period,
        billing_cycle_start_day,
        owner_profile:profiles!accounts_owner_id_fkey(name)
      `)
      .eq('shared_with_id', userId)
      .limit(1);
      
    if (sharedError) {
      console.error('Error getting shared accounts:', sharedError);
      throw sharedError;
    }
    
    // If user has a shared account, prioritize it (this is likely the most recent action)
    if (sharedAccounts && sharedAccounts.length > 0) {
      
      // Get owner name from joined profile data
      const ownerName = sharedAccounts[0]?.owner_profile?.name;
      
      return {
        id: sharedAccounts[0].id,
        name: sharedAccounts[0].name,
        subscription_status: sharedAccounts[0].subscription_status,
        trial_ends_at: sharedAccounts[0].trial_ends_at,
        plan_slug: sharedAccounts[0].plan_slug,
        billing_period: sharedAccounts[0].billing_period,
        billing_cycle_start_day: sharedAccounts[0].billing_cycle_start_day,
        ownerId: sharedAccounts[0].owner_id,
        ownerName: ownerName, 
        sharedWithId: userId,
        sharedWithEmail: sharedAccounts[0].shared_with_email,
        isSharedAccount: true
      };
    }
    
    return null;
  },

  // Get all accounts shared with the user
  getAllSharedAccounts: async (userId: string) => {
    
    const { data: sharedAccounts, error: sharedError } = await supabase
      .from('accounts')
      .select(`
        *,
        subscription_status,
        trial_ends_at,
        plan_slug,
        billing_period,
        billing_cycle_start_day,
        owner_profile:profiles!accounts_owner_id_fkey(name)
      `)
      .eq('shared_with_id', userId);
      
    if (sharedError) {
      console.error('Error getting shared accounts:', sharedError);
      throw sharedError;
    }
    
    // Transform shared accounts to include owner info
    return sharedAccounts?.map(account => {
      return {
        id: account.id,
        name: account.name,
        subscription_status: account.subscription_status,
        trial_ends_at: account.trial_ends_at,
        plan_slug: account.plan_slug,
        billing_period: account.billing_period,
        billing_cycle_start_day: account.billing_cycle_start_day,
        ownerId: account.owner_id,
        ownerName: account.owner_profile?.name,
        sharedWithId: userId,
        sharedWithEmail: account.shared_with_email,
        isSharedAccount: true
      };
    }) || [];
  }
};
