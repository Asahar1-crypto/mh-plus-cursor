
import { supabase } from "@/integrations/supabase/client";

/**
 * Validate that an account exists and is accessible
 */
export const validateAccountExists = async (accountId: string): Promise<boolean> => {
  try {
    console.log(`validateAccountExists: Checking if account ${accountId} exists`);
    
    const { data: account, error } = await supabase
      .from('accounts')
      .select('id, name, owner_id')
      .eq('id', accountId)
      .single();
      
    if (error) {
      console.error(`validateAccountExists: Error checking account ${accountId}:`, error);
      return false;
    }
    
    if (!account) {
      console.warn(`validateAccountExists: Account ${accountId} not found`);
      return false;
    }
    
    console.log(`validateAccountExists: Account ${accountId} exists:`, account);
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
    console.log(`getAccountDetails: Getting details for account ${accountId}`);
    
    const { data: account, error } = await supabase
      .from('accounts')
      .select('id, name, owner_id, shared_with_id, shared_with_email, invitation_id, created_at, updated_at')
      .eq('id', accountId)
      .single();
      
    if (error) {
      console.error(`getAccountDetails: Error getting account details:`, error);
      return null;
    }
    
    console.log(`getAccountDetails: Account details:`, account);
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
  try {
    console.log('debugListAllAccounts: Listing all accounts in the system');
    
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('id, name, owner_id, shared_with_id, shared_with_email, created_at')
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (error) {
      console.error('debugListAllAccounts: Error listing accounts:', error);
      return;
    }
    
    console.log(`debugListAllAccounts: Found ${accounts?.length || 0} accounts:`);
    accounts?.forEach((account, index) => {
      console.log(`  ${index + 1}. ${account.id} - "${account.name}" (Owner: ${account.owner_id})`);
    });

    // Get owner names separately
    if (accounts && accounts.length > 0) {
      const ownerIds = [...new Set(accounts.map(acc => acc.owner_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', ownerIds);
        
      console.log('debugListAllAccounts: Owner profiles:', profiles);
      
      accounts.forEach((account, index) => {
        const ownerProfile = profiles?.find(p => p.id === account.owner_id);
        const ownerName = ownerProfile?.name || 'Unknown';
        console.log(`  ${index + 1}. ${account.id} - "${account.name}" (Owner: ${ownerName})`);
      });
    }
  } catch (error) {
    console.error('debugListAllAccounts: Exception listing accounts:', error);
  }
};
