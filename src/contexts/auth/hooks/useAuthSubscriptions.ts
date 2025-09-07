
import { useEffect } from 'react';
import { User } from '../types';
import { supabase } from "@/integrations/supabase/client";
import { invitationCheckService } from '../services/user/invitationCheckService';

export const useAuthSubscriptions = (
  user: User | null,
  checkAndSetUserData: (forceRefresh?: boolean) => Promise<void>
) => {
  // Set up auth state listener and check for saved session
  useEffect(() => {
    console.log('Setting up auth state listener');
    
    // First set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        // Handle auth state changes
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          console.log('User signed in or token refreshed, updating session');
          // Wrap in setTimeout to prevent any potential recursion issues
          setTimeout(() => {
            checkAndSetUserData(true).catch(err => {
              console.error('Error checking auth state after event:', err);
            });
          }, 0);
        } else if (event === 'USER_UPDATED') {
          console.log('User updated - this could be email change, refreshing profile data');
          // כשמשתמש משנה מייל, Supabase שולח אירוע USER_UPDATED
          setTimeout(async () => {
            try {
              await checkAndSetUserData(true);
              // Show success message for email change
              if (session?.user?.email) {
                const { toast } = await import('sonner');
                toast.success('המייל שונה בהצלחה!');
              }
            } catch (err) {
              console.error('Error checking auth state after user update:', err);
            }
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
        // Check for pending invitations
        const invitations = await invitationCheckService.checkPendingInvitations(user.email);
        console.log('Initial invitation check result:', invitations);
        
        // Check if there's a pending invitation ID in sessionStorage that needs redirection
        const pendingInvitationId = sessionStorage.getItem('pendingInvitationId');
        if (pendingInvitationId) {
          console.log(`Found pendingInvitationId ${pendingInvitationId} in sessionStorage after auth check`);
          
          // Verify that the invitation exists and is valid before redirecting
          const isValid = await invitationCheckService.checkInvitationById(pendingInvitationId);
          
          if (isValid) {
            // Only redirect if user is on dashboard or home page (prevent redirection loops)
            const currentPath = window.location.pathname;
            const isOnBasePage = currentPath === '/' || currentPath === '/dashboard';
            
            if (isOnBasePage) {
              console.log(`Redirecting to invitation page: /invitation/${pendingInvitationId}`);
              setTimeout(() => {
                window.location.href = `/invitation/${pendingInvitationId}`;
              }, 1000);
            }
          } else {
            // If invitation is not valid, clear the pending ID to prevent further redirect attempts
            console.log("Clearing invalid pending invitation ID");
            sessionStorage.removeItem('pendingInvitationId');
            sessionStorage.removeItem('pendingInvitationRedirectChecked');
          }
        }
      } catch (error) {
        console.error("Failed to check pending invitations:", error);
        // Clear potentially problematic invitation data
        sessionStorage.removeItem('pendingInvitationId');
        sessionStorage.removeItem('pendingInvitationRedirectChecked');
      }
    };
    
    // Delay the check slightly to avoid any race conditions
    const timer = setTimeout(checkInvitationsOnce, 2000);
    
    return () => {
      clearTimeout(timer);
    };
  }, [user]);
};
