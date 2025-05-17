
import { supabase } from "@/integrations/supabase/client";
import { User, Account } from '../types';
import { accountService } from './accountService';
import { userService } from './user';
import { showInvitationNotification, checkForNewInvitations } from '@/utils/notifications';
import { toast } from 'sonner';
import { InvitationData } from './invitation/types';

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
        const pendingData = JSON.parse(pendingInvitationsData);
        const email = pendingData.email;
        const invitations = pendingData.invitations;
        
        // Case insensitive email comparison
        if (email.toLowerCase() === user.email.toLowerCase() && invitations && invitations.length > 0) {
          console.log(`Processing auto-linking for user ${user.email} with ${invitations.length} invitations`);
          
          // Try to accept the first invitation
          const invitation = invitations[0];
          
          if (!invitation.invitationId) {
            console.error("Invitation is missing invitationId");
            toast.error('אירעה שגיאה בקבלת ההזמנה האוטומטית');
            return { user, account: await accountService.getDefaultAccount(user.id, user.name) };
          }
          
          try {
            // Import and use acceptInvitation directly to avoid circular dependencies
            const { acceptInvitation } = await import('./invitation/acceptInvitation');
            
            console.log("Accepting invitation with ID:", invitation.invitationId);
            console.log("Current user for invitation acceptance:", user);
            
            // Store additional data in sessionStorage to help with acceptance
            if (invitation.accountId) {
              sessionStorage.setItem('pendingInvitationAccountId', invitation.accountId);
            }
            if (invitation.ownerId) {
              sessionStorage.setItem('pendingInvitationOwnerId', invitation.ownerId);
            }
            
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
            toast.error('אירעה שגיאה בקבלת ההזמנה האוטומטית, מתחבר לחשבון ברירת מחדל');
            localStorage.removeItem('pendingInvitationsAfterRegistration');
          }
        } else {
          console.log(`User email doesn't match invitation (${user.email.toLowerCase()} vs ${email.toLowerCase()}) or no invitations found`);
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
    
    // בדיקת הזמנות חדשות
    if (user.email) {
      await checkForNewInvitations(user.email);
    }
    
    // Check if there's a pendingInvitationId in sessionStorage
    const pendingInvitationId = sessionStorage.getItem('pendingInvitationId');
    if (pendingInvitationId) {
      console.log(`Found pendingInvitationId ${pendingInvitationId} in sessionStorage after login`);
      
      // Clear the pending invitation ID
      sessionStorage.removeItem('pendingInvitationId');
      
      // Redirect to the invitation page
      setTimeout(() => {
        window.location.href = `/invitation/${pendingInvitationId}`;
      }, 1000);
    }
    
    return { user, account };
  } catch (error) {
    console.error('Error checking authentication:', error);
    return { user: null, account: null };
  }
}
