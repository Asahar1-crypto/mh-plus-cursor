
import { supabase } from "@/integrations/supabase/client";
import { User, Account } from '../types';
import { accountService } from './accountService';
import { userService } from './user';
import { showInvitationNotification } from "@/utils/notifications";
import { toast } from 'sonner';

/**
 * Checks the current auth state and returns user and account if authenticated
 */
export async function checkAuth(): Promise<{ user: User | null, account: Account | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { user: null, account: null };
    }
    
    // Create user object based on Supabase session
    const user: User = {
      id: session.user.id,
      email: session.user.email || '',
      name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User'
    };
    
    console.log("User authenticated:", user);
    
    // Check if there are pending invitations from registration
    const pendingInvitationsData = localStorage.getItem('pendingInvitationsAfterRegistration');
    
    if (pendingInvitationsData) {
      console.log("Found pending invitations after registration:", pendingInvitationsData);
      
      try {
        const { email, invitations } = JSON.parse(pendingInvitationsData);
        
        // Check if this is the right user for these invitations
        if (email === user.email && invitations && invitations.length > 0) {
          console.log(`Processing auto-linking for user ${user.email} with ${invitations.length} invitations`);
          
          // Try to accept the first invitation
          const invitation = invitations[0];
          
          if (!invitation.invitationId) {
            console.error("Invitation is missing invitationId");
            localStorage.removeItem('pendingInvitationsAfterRegistration');
            return { user, account: await accountService.getDefaultAccount(user.id, user.name) };
          }
          
          try {
            // Import and use acceptInvitation directly
            const { acceptInvitation } = await import('./invitation/acceptInvitation');
            
            // Accept the invitation with the current user
            const sharedAccount = await acceptInvitation(invitation.invitationId, user);
            console.log("Successfully accepted invitation after registration:", sharedAccount);
            
            // Remove the pending invitation data
            localStorage.removeItem('pendingInvitationsAfterRegistration');
            
            toast.success('התחברת אוטומטית לחשבון שהוזמנת אליו!');
            
            // Return the shared account
            return { user, account: sharedAccount };
            
          } catch (error) {
            console.error('Error accepting invitation after registration:', error);
            localStorage.removeItem('pendingInvitationsAfterRegistration');
          }
        } else {
          console.log("User email doesn't match invitation or no invitations found");
          localStorage.removeItem('pendingInvitationsAfterRegistration');
        }
      } catch (error) {
        console.error('Error processing pending invitations after registration:', error);
        localStorage.removeItem('pendingInvitationsAfterRegistration');
      }
    }
    
    // Get user account (default flow if no pending invitation was processed)
    const account = await accountService.getDefaultAccount(user.id, user.name);
    console.log("Default account retrieved:", account);
    
    // Check for valid invitations by email
    const invitations = await userService.checkPendingInvitations(user.email);
    
    // If there's a pending invitation, notify the user
    if (invitations && invitations.length > 0) {
      console.log(`Found ${invitations.length} pending invitations for ${user.email}`);
      
      // Store the invitation in localStorage so we can access it later
      const pendingInvitations = {};
      invitations.forEach(inv => {
        // Safety checks to ensure we're dealing with valid data
        if (typeof inv === 'object' && inv !== null && !('error' in inv)) {
          // Safely access properties using optional chaining and nullish coalescing
          const accountName = inv.accounts?.name || 'חשבון משותף';
          const ownerName = inv.owner_profile?.name || 'בעל החשבון';
          
          pendingInvitations[inv.invitation_id] = {
            name: accountName,
            ownerName,
            sharedWithEmail: inv.email,
            invitationId: inv.invitation_id
          };
        } else {
          console.error("Invalid invitation data:", inv);
        }
      });
      
      localStorage.setItem('pendingInvitations', JSON.stringify(pendingInvitations));
      
      // Notify the user about the pending invitation
      showInvitationNotification(invitations[0].invitation_id);
    }
    
    return { user, account };
  } catch (error) {
    console.error('Error checking authentication:', error);
    return { user: null, account: null };
  }
}
