
import { supabase } from "@/integrations/supabase/client";

// Define interface for the invitation data that correctly handles profile errors
interface InvitationData {
  id: string;
  account_id: string;
  email: string;
  invitation_id: string;
  expires_at: string;
  accepted_at: string | null;
  accounts?: {
    name: string;
    id: string;
    owner_id: string;
    profiles?: {
      name?: string;
    };
  };
  owner_profile?: {
    name?: string;
  };
}

/**
 * Service for checking pending invitations for a user
 */
export const invitationCheckService = {
  // Check for pending invitations for a user
  checkPendingInvitations: async (email: string): Promise<InvitationData[]> => {
    try {
      console.log(`Checking pending invitations for ${email}`);
      
      // Modified query to ensure data integrity and better error handling
      // Using simple select query format for better compatibility
      const { data: invitations, error } = await supabase
        .from('invitations')
        .select('*, accounts(*)')
        .eq('email', email)
        .is('accepted_at', null)
        .gt('expires_at', 'now()');
        
      if (error) {
        console.error("Error checking pending invitations:", error);
        throw error;
      }

      if (!invitations || invitations.length === 0) {
        console.log(`No pending invitations found for ${email}`);
        return [];
      }

      console.log(`Found invitations:`, invitations);

      // Now let's get the owner profiles for these invitations in a separate query
      // This avoids the issues with the relationship between invitations and profiles
      const ownerIds = invitations
        .map(inv => inv.accounts?.owner_id)
        .filter(id => id) as string[];

      let ownerProfiles = {};
      
      if (ownerIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', ownerIds);
          
        if (!profileError && profiles) {
          // Create a map of owner_id to profile data
          ownerProfiles = profiles.reduce((acc, profile) => {
            acc[profile.id] = { name: profile.name };
            return acc;
          }, {});
          
          console.log("Owner profiles:", ownerProfiles);
        } else {
          console.error("Error fetching owner profiles:", profileError);
        }
      }

      // Combine the data
      const enrichedInvitations = invitations.map(inv => {
        const ownerId = inv.accounts?.owner_id;
        return {
          ...inv,
          owner_profile: ownerId ? (ownerProfiles[ownerId] || null) : null
        };
      });

      console.log(`Found and processed ${enrichedInvitations.length} pending invitations for ${email}`);
      
      // Store invitations in localStorage with complete account information
      const pendingInvitations = {};
      enrichedInvitations.forEach(inv => {
        if (inv.accounts) {
          pendingInvitations[inv.invitation_id] = {
            name: inv.accounts.name || 'חשבון משותף',
            ownerName: inv.accounts.profiles?.name || inv.owner_profile?.name || 'בעל החשבון',
            ownerId: inv.accounts.owner_id, // Store the owner ID properly
            sharedWithEmail: inv.email,
            invitationId: inv.invitation_id,
            accountId: inv.account_id  // Store the account_id in localStorage
          };
        } else {
          // Fallback if we can't get the account information
          pendingInvitations[inv.invitation_id] = {
            name: 'חשבון משותף',
            ownerName: 'בעל החשבון',
            sharedWithEmail: inv.email,
            invitationId: inv.invitation_id,
            accountId: inv.account_id
          };
        }
      });
      
      localStorage.setItem('pendingInvitations', JSON.stringify(pendingInvitations));
      console.log("Updated localStorage with pending invitations:", pendingInvitations);
      
      return enrichedInvitations as InvitationData[];
    } catch (error) {
      console.error('Failed to check pending invitations:', error);
      return [];
    }
  }
};
