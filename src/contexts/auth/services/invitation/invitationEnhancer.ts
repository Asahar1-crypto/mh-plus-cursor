
import { InvitationData } from './types';
import { fetchAccountData } from './accountFetcher';
import { fetchOwnerProfile } from './profileFetcher';

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
