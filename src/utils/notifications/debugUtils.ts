
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

/**
 * Debug function to display invitation data from sessionStorage in console
 */
export const debugInvitations = () => {
  try {
    console.group("🔍 Invitation Debug Information");

    // Get all invitation related data from sessionStorage
    const pendingInvitationId = sessionStorage.getItem('pendingInvitationId');
    const pendingInvitationAccountId = sessionStorage.getItem('pendingInvitationAccountId');
    const pendingInvitationOwnerId = sessionStorage.getItem('pendingInvitationOwnerId');
    const notifiedInvitationsStr = sessionStorage.getItem('notifiedInvitations');
    const currentInvitationDetailsStr = sessionStorage.getItem('currentInvitationDetails');
    const pendingInvitationsAfterRegistrationStr = sessionStorage.getItem('pendingInvitationsAfterRegistration');
    
    // Structured debug output
    console.log("== Current Session Storage State ==");
    console.log("pendingInvitationId:", pendingInvitationId || "not set");
    console.log("pendingInvitationAccountId:", pendingInvitationAccountId || "not set");
    console.log("pendingInvitationOwnerId:", pendingInvitationOwnerId || "not set");
    
    // Parse JSON data
    let notifiedInvitations = [];
    let currentInvitationDetails = null;
    let pendingInvitationsAfterRegistration = [];
    
    try {
      if (notifiedInvitationsStr) {
        notifiedInvitations = JSON.parse(notifiedInvitationsStr);
        console.log("notifiedInvitations:", notifiedInvitations);
      } else {
        console.log("notifiedInvitations: not set");
      }
    } catch (e) {
      console.error("Failed to parse notifiedInvitations:", e);
    }
    
    try {
      if (currentInvitationDetailsStr) {
        currentInvitationDetails = JSON.parse(currentInvitationDetailsStr);
        console.log("currentInvitationDetails:", currentInvitationDetails);
      } else {
        console.log("currentInvitationDetails: not set");
      }
    } catch (e) {
      console.error("Failed to parse currentInvitationDetails:", e);
    }
    
    try {
      if (pendingInvitationsAfterRegistrationStr) {
        pendingInvitationsAfterRegistration = JSON.parse(pendingInvitationsAfterRegistrationStr);
        console.log("pendingInvitationsAfterRegistration:", pendingInvitationsAfterRegistration);
      } else {
        console.log("pendingInvitationsAfterRegistration: not set");
      }
    } catch (e) {
      console.error("Failed to parse pendingInvitationsAfterRegistration:", e);
    }
    
    console.log("== Summary ==");
    console.log(`Number of notifications: ${notifiedInvitations?.length || 0}`);
    console.log(`Has current invitation details: ${currentInvitationDetails ? "Yes" : "No"}`);
    console.log(`Has pending registrations: ${pendingInvitationsAfterRegistration?.length || 0}`);
    
    console.groupEnd();

  } catch (error) {
    console.error("Error in debugInvitations:", error);
    toast.error("שגיאה בעת הצגת נתוני הזמנה");
  }
};

/**
 * Debug function to display current account and authentication state
 */
export const debugAuthState = async () => {
  try {
    console.group("🔍 Authentication & Account Debug Information");
    
    // Check local storage for auth data
    const hasAuthData = localStorage.getItem('sb-hchmfsilgfrzhenafbzi-auth-token');
    
    console.log("== Auth State ==");
    console.log(`Auth data present in localStorage: ${hasAuthData ? "Yes" : "No"}`);
    
    if (hasAuthData) {
      try {
        const session = JSON.parse(hasAuthData);
        console.log("User ID:", session.user.id);
        console.log("User email:", session.user.email);
        
        // Get additional user information
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (userError) {
          console.error("Error fetching user profile:", userError);
        } else {
          console.log("User profile:", userData);
        }
        
        // Get account information
        const { data: accountData, error: accountError } = await supabase
          .from('accounts')
          .select('*')
          .or(`owner_id.eq.${session.user.id},shared_with_id.eq.${session.user.id}`);
          
        if (accountError) {
          console.error("Error fetching account data:", accountError);
        } else {
          console.log("Associated accounts:", accountData);
          
          // Check for pending invitations
          const { data: invitationData, error: invitationError } = await supabase
            .from('invitations')
            .select('*')
            .or(`email.eq.${session.user.email.toLowerCase()}`);
            
          if (invitationError) {
            console.error("Error fetching invitation data:", invitationError);
          } else {
            console.log("Pending invitations:", invitationData);
          }
        }
      } catch (parseError) {
        console.error("Error parsing auth data:", parseError);
      }
    }
    
    console.groupEnd();
  } catch (error) {
    console.error("Error in debugAuthState:", error);
    toast.error("שגיאה בעת הצגת נתוני התחברות");
  }
};
