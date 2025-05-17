
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
          try {
            const acceptInvitationModule = await import('./invitation');
            await acceptInvitationModule.invitationService.acceptInvitation(invitation.invitationId, user);
            
            // Remove the pending invitation data
            localStorage.removeItem('pendingInvitationsAfterRegistration');
            console.log("Removed pending invitations data after processing");
            
            toast.success('התחברת אוטומטית לחשבון שהוזמנת אליו!');
            
            // Get the account after accepting the invitation
            const { sharedAccounts } = await accountService.getUserAccounts(user.id);
            if (sharedAccounts && sharedAccounts.length > 0) {
              console.log("Returning shared account after auto-linking:", sharedAccounts[0]);
              return { 
                user, 
                account: {
                  id: sharedAccounts[0].id,
                  name: sharedAccounts[0].name,
                  ownerId: sharedAccounts[0].owner_id,
                  sharedWithId: user.id,
                  sharedWithEmail: user.email
                }
              };
            }
          } catch (error) {
            console.error('Error accepting invitation after registration:', error);
          }
        } else {
          console.log("User email doesn't match invitation or no invitations found");
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
        // Safely access properties using optional chaining and nullish coalescing
        const accountName = inv.accounts?.name || 'חשבון משותף';
        const ownerName = inv.owner_profile?.name || 'בעל החשבון';
        
        pendingInvitations[inv.invitation_id] = {
          name: accountName,
          ownerName,
          sharedWithEmail: inv.email,
          invitationId: inv.invitation_id
        };
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
