
import { toast } from 'sonner';

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
      }
    } catch (e) {
      console.error("Failed to parse notifiedInvitations:", e);
    }
    
    try {
      if (currentInvitationDetailsStr) {
        currentInvitationDetails = JSON.parse(currentInvitationDetailsStr);
        console.log("currentInvitationDetails:", currentInvitationDetails);
      }
    } catch (e) {
      console.error("Failed to parse currentInvitationDetails:", e);
    }
    
    try {
      if (pendingInvitationsAfterRegistrationStr) {
        pendingInvitationsAfterRegistration = JSON.parse(pendingInvitationsAfterRegistrationStr);
        console.log("pendingInvitationsAfterRegistration:", pendingInvitationsAfterRegistration);
      }
    } catch (e) {
      console.error("Failed to parse pendingInvitationsAfterRegistration:", e);
    }
    
    console.log("== Summary ==");
    console.log(`Number of notifications: ${notifiedInvitations.length || 0}`);
    console.log(`Has current invitation details: ${currentInvitationDetails ? "Yes" : "No"}`);
    console.log(`Has pending registrations: ${pendingInvitationsAfterRegistration.length || 0}`);
    
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
    
    // Additional debugging info can be added here as needed
    
    console.groupEnd();
  } catch (error) {
    console.error("Error in debugAuthState:", error);
    toast.error("שגיאה בעת הצגת נתוני התחברות");
  }
};
