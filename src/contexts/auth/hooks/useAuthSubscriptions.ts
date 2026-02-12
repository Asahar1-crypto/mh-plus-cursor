
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
    // First set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        
        // Handle auth state changes
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Wrap in setTimeout to prevent any potential recursion issues
          setTimeout(() => {
            checkAndSetUserData(true).catch(err => {
              console.error('Error checking auth state after event:', err);
            });
          }, 0);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [checkAndSetUserData]);

  // Set up ONE TIME invitation check for logged-in users, not recurring checks
  useEffect(() => {
    if (!user?.email) return;
    
    // One-time invitation check for logged-in users
    
    // Keep track if check has been performed to avoid loops
    let checkDone = false;
    
    // Only do an initial check when component loads
    const checkInvitationsOnce = async () => {
      if (checkDone) return;
      
      try {
        checkDone = true;
        // Check for pending invitations
        const invitations = await invitationCheckService.checkPendingInvitations(user.email);
        
        // Check if there's a pending invitation ID in sessionStorage that needs redirection
        const pendingInvitationId = sessionStorage.getItem('pendingInvitationId');
        if (pendingInvitationId) {
          
          // Verify that the invitation exists and is valid before redirecting
          const isValid = await invitationCheckService.checkInvitationById(pendingInvitationId);
          
          if (isValid) {
            // Only redirect if user is on dashboard or home page (prevent redirection loops)
            const currentPath = window.location.pathname;
            const isOnBasePage = currentPath === '/' || currentPath === '/dashboard';
            
            if (isOnBasePage) {
              setTimeout(() => {
                window.location.href = `/invitation/${pendingInvitationId}`;
              }, 1000);
            }
          } else {
            // If invitation is not valid, clear the pending ID to prevent further redirect attempts
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
