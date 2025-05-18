
import { useEffect } from 'react';
import { User } from '../types';
import { supabase } from "@/integrations/supabase/client";
import { invitationCheckService } from '../services/user/invitationCheckService';
import { showInvitationNotification } from '@/utils/notifications';

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
            
            // Check for pending invitations after sign in
            if (session?.user?.email) {
              setTimeout(async () => {
                try {
                  const invitations = await invitationCheckService.checkPendingInvitations(session.user.email || '');
                  // Show notification for first invitation if exists
                  if (invitations && invitations.length > 0 && invitations[0].invitation_id) {
                    showInvitationNotification(invitations[0].invitation_id);
                  }
                } catch (error) {
                  console.error('Error checking pending invitations:', error);
                }
              }, 1000);
            }
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          // No need to do anything here as the AuthProvider will handle this
        }
      }
    );

    return () => {
      console.log('Cleaning up auth state listener');
      subscription.unsubscribe();
    };
  }, [checkAndSetUserData]);

  // Set up periodic invitation checking for logged-in users
  useEffect(() => {
    if (!user?.email) return;
    
    console.log('Setting up periodic invitation checking for', user.email);
    
    // Do an immediate check when component loads
    setTimeout(async () => {
      try {
        const invitations = await invitationCheckService.checkPendingInvitations(user.email);
        console.log('Initial invitation check result:', invitations);
      } catch (error) {
        console.error('Error during initial invitation check:', error);
      }
    }, 2000);
    
    // Then set up periodic checking
    const checkInvitationsInterval = setInterval(async () => {
      try {
        await invitationCheckService.checkPendingInvitations(user.email);
      } catch (error) {
        console.error('Error during periodic invitation check:', error);
      }
    }, 30000); // Check every 30 seconds
    
    return () => {
      console.log('Cleaning up invitation check interval');
      clearInterval(checkInvitationsInterval);
    };
  }, [user]);
};
