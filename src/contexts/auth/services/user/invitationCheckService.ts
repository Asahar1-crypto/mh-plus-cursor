
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { PendingInvitationRecord } from '../../services/invitation/types';

/**
 * Service for checking pending invitations for a user
 */
export const invitationCheckService = {
  // Check for pending invitations for a user
  checkPendingInvitations: async (email: string): Promise<any[]> => {
    try {
      console.log(`Checking pending invitations for ${email}`);
      
      // Get basic invitation data
      const { data: invitations, error } = await supabase
        .from('invitations')
        .select(`
          id,
          account_id,
          email,
          invitation_id,
          expires_at,
          accepted_at,
          accounts:account_id (
            id,
            name,
            owner_id
          )
        `)
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

      console.log(`Found ${invitations.length} pending invitations for ${email}:`, invitations);
      
      // Get enriched invitation data with owner information
      const enrichedInvitations = [];
      
      for (const invitation of invitations) {
        if (!invitation.accounts || !invitation.account_id) {
          console.warn(`Invitation ${invitation.invitation_id} has no account data`);
          continue;
        }
        
        // Get owner profile information
        const { data: ownerProfile, error: profileError } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', invitation.accounts.owner_id)
          .single();
          
        if (profileError) {
          console.warn(`Error fetching owner profile for account ${invitation.account_id}:`, profileError);
        }
        
        const ownerName = ownerProfile?.name || 'בעל החשבון';
        console.log(`Owner profile for account ${invitation.account_id}:`, ownerProfile);
        
        // Add enriched invitation to list
        enrichedInvitations.push({
          ...invitation,
          owner_profile: { name: ownerName }
        });
      }

      console.log(`Processed ${enrichedInvitations.length} pending invitations for ${email}`);
      
      // Store invitations in localStorage with complete account information
      const pendingInvitations: Record<string, PendingInvitationRecord> = {};
      
      enrichedInvitations.forEach(inv => {
        pendingInvitations[inv.invitation_id] = {
          name: inv.accounts?.name || 'חשבון משותף',
          ownerName: inv.owner_profile?.name || 'בעל החשבון',
          ownerId: inv.accounts?.owner_id,
          sharedWithEmail: inv.email,
          invitationId: inv.invitation_id,
          accountId: inv.account_id
        };
      });
      
      // Save to localStorage
      localStorage.setItem('pendingInvitations', JSON.stringify(pendingInvitations));
      console.log("Updated localStorage with pending invitations:", pendingInvitations);
      
      // Show notification for first invitation
      if (enrichedInvitations.length > 0) {
        const firstInvitation = enrichedInvitations[0];
        const ownerName = firstInvitation.owner_profile?.name || 'בעל החשבון';
        const accountName = firstInvitation.accounts?.name || 'חשבון משותף';
        
        toast.info(
          `יש לך הזמנה מ-${ownerName} לחשבון "${accountName}"`,
          {
            description: `לצפייה בהזמנה, לחץ על כפתור "צפה בהזמנה" בראש הדף`,
            duration: 10000
          }
        );
      }
      
      return enrichedInvitations;
    } catch (error) {
      console.error('Failed to check pending invitations:', error);
      return [];
    }
  }
};
