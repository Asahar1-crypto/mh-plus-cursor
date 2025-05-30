
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch account data for an invitation
 */
export const fetchAccountData = async (accountId: string): Promise<any | null> => {
  if (!accountId) {
    console.error('fetchAccountData: No account ID provided');
    return null;
  }
  
  console.log(`fetchAccountData: Looking for account with ID: ${accountId}`);
  
  // First verify the account exists
  const { data: accountExists, error: accountCheckError } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', accountId)
    .single();
    
  if (accountCheckError || !accountExists) {
    console.warn(`fetchAccountData: No account found for ID ${accountId}. Error:`, accountCheckError);
    
    // Debug: Let's see what accounts DO exist
    const { data: debugAccounts } = await supabase
      .from('accounts')
      .select('id, name, owner_id')
      .limit(10);
    console.log('fetchAccountData: Debug - existing accounts:', debugAccounts);
    
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
  
  console.log('fetchAccountData: Successfully fetched account:', accountData);
  return accountData;
};
