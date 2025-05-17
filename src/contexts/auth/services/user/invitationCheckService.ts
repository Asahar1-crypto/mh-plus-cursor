
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';

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
      
      // Get basic invitation data first
      const { data: invitations, error } = await supabase
        .from('invitations')
        .select('id, account_id, email, invitation_id, expires_at, accepted_at')
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

      console.log(`Found ${invitations.length} invitations:`, invitations);
      
      // Get account information for each invitation
      const enrichedInvitations = [];
      
      for (const invitation of invitations) {
        // Get account information
        const { data: account, error: accountError } = await supabase
          .from('accounts')
          .select('*')
          .eq('id', invitation.account_id)
          .single();
          
        if (accountError) {
          console.error(`Error fetching account for invitation ${invitation.invitation_id}:`, accountError);
          continue;
        }
        
        if (!account) {
          console.warn(`No account found for invitation ${invitation.invitation_id}`);
          continue;
        }
        
        console.log(`Found account for invitation ${invitation.invitation_id}:`, account);
        
        // Get owner profile
        const { data: ownerProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id, name')
          .eq('id', account.owner_id)
          .single();
          
        if (profileError) {
          console.warn(`Error fetching owner profile for account ${account.id}:`, profileError);
        }
        
        console.log(`Owner profile for account ${account.id}:`, ownerProfile);
        
        // Combine the data
        enrichedInvitations.push({
          ...invitation,
          accounts: {
            name: account.name,
            id: account.id,
            owner_id: account.owner_id
          },
          owner_profile: ownerProfile || { name: 'בעל החשבון' }
        });
      }

      console.log(`Processed ${enrichedInvitations.length} pending invitations for ${email}`);
      
      // הצגת התראה על ההזמנות הממתינות
      if (enrichedInvitations.length > 0) {
        // מציגים התראה על ההזמנה הראשונה
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
      
      // Store invitations in localStorage with complete account information
      const pendingInvitations = {};
      enrichedInvitations.forEach(inv => {
        if (inv.accounts) {
          pendingInvitations[inv.invitation_id] = {
            name: inv.accounts.name || 'חשבון משותף',
            ownerName: inv.owner_profile?.name || 'בעל החשבון',
            ownerId: inv.accounts.owner_id,
            sharedWithEmail: inv.email,
            invitationId: inv.invitation_id,
            accountId: inv.account_id
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
