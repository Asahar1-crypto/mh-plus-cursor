
import { supabase } from "@/integrations/supabase/client";
import { InvitationData } from './types';

/**
 * Fetch account data for an invitation
 */
export const fetchAccountData = async (accountId: string): Promise<any | null> => {
  if (!accountId) {
    console.error('No account ID provided');
    return null;
  }
  
  // First verify the account exists
  const { data: accountExists, error: accountCheckError } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', accountId)
    .single();
    
  if (accountCheckError || !accountExists) {
    console.warn(`No account found for ID ${accountId}`);
    return null;
  }
  
  // Now fetch the full account data
  const { data: accountData, error: accountError } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', accountId)
    .single();
    
  if (accountError || !accountData) {
    console.error('Failed to fetch account data:', accountError);
    return null;
  }
  
  return accountData;
};

/**
 * Fetch owner profile for an account
 */
export const fetchOwnerProfile = async (ownerId: string): Promise<{ name: string }> => {
  if (!ownerId) {
    return { name: 'בעל החשבון' };
  }
  
  try {
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', ownerId)
      .maybeSingle();
      
    if (ownerProfile && ownerProfile.name) {
      return { name: ownerProfile.name };
    }
  } catch (err) {
    console.error('Error fetching owner profile:', err);
  }
  
  return { name: 'בעל החשבון' };
};

/**
 * Clean up invalid invitations
 */
export const cleanupInvalidInvitation = async (invitationId: string): Promise<void> => {
  try {
    await supabase
      .from('invitations')
      .delete()
      .eq('invitation_id', invitationId);
  } catch (error) {
    console.error('Error cleaning up invalid invitation:', error);
  }
};

/**
 * Enhance invitation data with related account and owner info
 */
export const enhanceInvitation = async (invitation: any): Promise<InvitationData | null> => {
  if (!invitation || !invitation.account_id || !invitation.invitation_id) {
    console.warn('Invalid invitation data:', invitation);
    return null;
  }
  
  try {
    // Get account data
    const accountData = await fetchAccountData(invitation.account_id);
    
    if (!accountData) {
      return null;
    }
    
    // Check if owner ID exists
    if (!accountData.owner_id) {
      console.warn('Invalid account data - missing owner_id:', accountData);
      return null;
    }
    
    // Get owner profile
    const ownerProfile = await fetchOwnerProfile(accountData.owner_id);
    
    // Create enhanced invitation object
    const enhancedInvitation: InvitationData = {
      ...invitation,
      accounts: accountData,
      owner_profile: ownerProfile,
    };
    
    return enhancedInvitation;
  } catch (error) {
    console.error('Error enhancing invitation:', error);
    return null;
  }
};
