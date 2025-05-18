
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { PendingInvitationRecord } from '../../services/invitation/types';
import { showInvitationNotification } from '@/utils/notifications';

/**
 * Service for checking pending invitations for a user
 */
export const invitationCheckService = {
  // Check for pending invitations for a user
  checkPendingInvitations: async (email: string): Promise<any[]> => {
    if (!email) {
      console.log('No email provided for invitation check');
      return [];
    }
    
    try {
      console.log(`Checking pending invitations for ${email}`);
      
      // Normalize email to lowercase for consistent comparison
      const normalizedEmail = email.toLowerCase();
      
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
            owner_id,
            profiles!owner_id (
              id,
              name
            )
          )
        `)
        .eq('email', normalizedEmail)
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
      let shouldShowNotification = false;
      
      for (const invitation of invitations) {
        if (!invitation.accounts || !invitation.account_id) {
          console.warn(`Invitation ${invitation.invitation_id} has no account data`);
          continue;
        }
        
        // Owner information is now included directly in the query via the nested select
        const ownerName = invitation.accounts.profiles?.[0]?.name || 'בעל החשבון';
        
        // Check if we've already notified about this invitation
        const notifiedInvitations = localStorage.getItem('notifiedInvitations') || '[]';
        const notifiedIds = JSON.parse(notifiedInvitations);
        
        if (!notifiedIds.includes(invitation.invitation_id)) {
          shouldShowNotification = true;
          // Mark as notified
          notifiedIds.push(invitation.invitation_id);
          localStorage.setItem('notifiedInvitations', JSON.stringify(notifiedIds));
        }
        
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
        if (inv.invitation_id) {
          pendingInvitations[inv.invitation_id] = {
            name: inv.accounts?.name || 'חשבון משותף',
            ownerName: inv.owner_profile?.name || 'בעל החשבון',
            ownerId: inv.accounts?.owner_id,
            sharedWithEmail: inv.email,
            invitationId: inv.invitation_id,
            accountId: inv.account_id
          };
        }
      });
      
      // Save to localStorage
      localStorage.setItem('pendingInvitations', JSON.stringify(pendingInvitations));
      console.log("Updated localStorage with pending invitations:", pendingInvitations);
      
      // Show notification for first invitation if we haven't shown it before
      if (shouldShowNotification && enrichedInvitations.length > 0 && enrichedInvitations[0].invitation_id) {
        showInvitationNotification(enrichedInvitations[0].invitation_id);
      }
      
      return enrichedInvitations;
    } catch (error) {
      console.error('Failed to check pending invitations:', error);
      return [];
    }
  }
};
