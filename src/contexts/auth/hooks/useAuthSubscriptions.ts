
import { useEffect } from 'react';
import { User } from '../types';
import { supabase } from "@/integrations/supabase/client";
import { invitationCheckService } from '../services/user/invitationCheckService';

export const useAuthSubscriptions = (
  user: User | null,
  checkAndSetUserData: () => Promise<void>
) => {
  // Set up auth state listener and check for saved session
  useEffect(() => {
    // First set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Handle auth state changes
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // User signed in or token refreshed, update session
          await checkAndSetUserData();
          
          // Check for pending invitations after sign in
          if (session?.user?.email) {
            setTimeout(async () => {
              await invitationCheckService.checkPendingInvitations(session.user.email || '');
            }, 1000);
          }
        } else if (event === 'SIGNED_OUT') {
          // User signed out, clear session
          // We'll handle this in the parent component
        }
      }
    );

    // Check for an existing session
    checkAndSetUserData();

    return () => {
      subscription.unsubscribe();
    };
  }, [checkAndSetUserData]);

  // Set up periodic invitation checking for logged-in users
  useEffect(() => {
    // Set up periodic invitation checking for logged-in users
    if (user?.email) {
      const checkInvitationsInterval = setInterval(async () => {
        await invitationCheckService.checkPendingInvitations(user.email);
      }, 30000); // Check every 30 seconds
      
      return () => clearInterval(checkInvitationsInterval);
    }
  }, [user]);
};
