
import { supabase } from "@/integrations/supabase/client";

/**
 * Validate that an account exists and is accessible
 */
export const validateAccountExists = async (accountId: string): Promise<boolean> => {
  try {
    
    const { data: account, error } = await supabase
      .from('accounts')
      .select('id, name, owner_id')
      .eq('id', accountId)
      .maybeSingle();
      
    if (error) {
      console.error(`validateAccountExists: Error checking account ${accountId}:`, error);
      return false;
    }
    
    if (!account) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`validateAccountExists: Exception checking account ${accountId}:`, error);
    return false;
  }
};

/**
 * Get detailed account information for debugging
 */
export const getAccountDetails = async (accountId: string): Promise<any> => {
  try {
    
    const { data: account, error } = await supabase
      .from('accounts')
      .select('id, name, owner_id, shared_with_id, shared_with_email, invitation_id, created_at, updated_at')
      .eq('id', accountId)
      .maybeSingle();
      
    if (error) {
      console.error(`getAccountDetails: Error getting account details:`, error);
      return null;
    }
    
    return account;
  } catch (error) {
    console.error(`getAccountDetails: Exception getting account details:`, error);
    return null;
  }
};

/**
 * Debug function to list all accounts in the system
 */
export const debugListAllAccounts = async (): Promise<void> => {
  // Debug utility - no-op in production
};
