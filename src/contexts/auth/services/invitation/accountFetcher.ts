
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch account data for an invitation
 */
export const fetchAccountData = async (accountId: string): Promise<any | null> => {
  if (!accountId) {
    console.error('fetchAccountData: No account ID provided');
    return null;
  }
  
  // First verify the account exists
  const { data: accountExists, error: accountCheckError } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', accountId)
    .single();
    
  if (accountCheckError || !accountExists) {
    return null;
  }
  
  // Now fetch the full account data
  const { data: accountData, error: accountError } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', accountId)
    .single();
    
  if (accountError || !accountData) {
    console.error('fetchAccountData: Failed to fetch account data:', accountError);
    return null;
  }
  
  return accountData;
};
