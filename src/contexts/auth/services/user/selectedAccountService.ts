
import { supabase } from "@/integrations/supabase/client";

/**
 * Service for managing user's selected account preference
 */
export const selectedAccountService = {
  // Get user's selected account ID from their profile
  getSelectedAccountId: async (userId: string): Promise<string | null> => {
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('selected_account_id')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error('Error getting selected account ID:', error);
      return null;
    }
    
    return profile?.selected_account_id || null;
  },

  // Set user's selected account ID in their profile
  setSelectedAccountId: async (userId: string, accountId: string): Promise<void> => {
    
    const { error } = await supabase
      .from('profiles')
      .update({ selected_account_id: accountId })
      .eq('id', userId);
      
    if (error) {
      console.error('Error setting selected account ID:', error);
      throw error;
    }
    
  }
};
