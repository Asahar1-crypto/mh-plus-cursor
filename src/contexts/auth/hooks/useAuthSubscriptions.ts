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
    console.log('Setting up auth state listener');
    
    // First set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event);
        
        // Handle auth state changes
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          console.log('User signed in or token refreshed, updating session');
          // Wrap in setTimeout to prevent any potential recursion issues
          setTimeout(() => {
            checkAndSetUserData().catch(err => {
              console.error('Error checking auth state after event:', err);
            });
          }, 0);
        }
      }
    );

    return () => {
      console.log('Cleaning up auth state listener');
      subscription.unsubscribe();
    };
  }, [checkAndSetUserData]);

  // Set up ONE TIME invitation check for logged-in users, not recurring checks
  useEffect(() => {
    if (!user?.email) return;
    
    console.log('Setting up one-time invitation check for', user.email);
    
    // Keep track if check has been performed to avoid loops
    let checkDone = false;
    
    // Only do an initial check when component loads
    const checkInvitationsOnce = async () => {
      if (checkDone) return;
      
      try {
        checkDone = true;
        const invitations = await invitationCheckService.checkPendingInvitations(user.email);
        console.log('Initial invitation check result:', invitations);
      } catch (error) {
        console.error("Failed to check pending invitations:", error);
      }
    };
    
    // Delay the check slightly to avoid any race conditions
    const timer = setTimeout(checkInvitationsOnce, 2000);
    
    return () => {
      clearTimeout(timer);
    };
  }, [user]);
};
