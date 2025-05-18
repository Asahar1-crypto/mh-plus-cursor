
import { supabase } from "@/integrations/supabase/client";
import { User, Account } from '../types';
import { accountService } from './accountService';
import { userService } from './user';
import { checkForNewInvitations } from '@/utils/notifications';
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
    
    // Check if there is a pending invitation ID in session storage
    const pendingInvitationId = sessionStorage.getItem('pendingInvitationId');
    
    if (pendingInvitationId) {
      console.log(`Found pendingInvitationId ${pendingInvitationId} in sessionStorage`);
      
      try {
        // Verify that the invitation exists and is valid
        const { data: invitation } = await supabase
          .from('invitations')
          .select(`
            invitation_id,
            email,
            account_id,
            accepted_at,
            expires_at
          `)
          .eq('invitation_id', pendingInvitationId)
          .eq('email', user.email.toLowerCase())
          .is('accepted_at', null)
          .gt('expires_at', 'now()');
          
        if (invitation && invitation.length > 0) {
          console.log(`Verified that invitation ${pendingInvitationId} is valid for user ${user.email}`);
          
          // If the user just registered, we'll redirect to the invitation page
          // but don't clear the pending invitation ID yet
          setTimeout(() => {
            window.location.href = `/invitation/${pendingInvitationId}`;
          }, 1000);
        } else {
          console.log("Invitation not found or not valid, clearing pendingInvitationId");
          sessionStorage.removeItem('pendingInvitationId');
        }
      } catch (error) {
        console.error("Error verifying invitation:", error);
        sessionStorage.removeItem('pendingInvitationId');
      }
    }
    
    // Get user account
    const account = await accountService.getDefaultAccount(user.id, user.name);
    console.log("Default account retrieved:", account);
    
    // Check for new invitations
    if (user.email) {
      await checkForNewInvitations(user.email);
    }
    
    return { user, account };
  } catch (error) {
    console.error('Error checking authentication:', error);
    return { user: null, account: null };
  }
}
