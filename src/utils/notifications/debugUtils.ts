
/**
 * Debug helper - Dumps invitation info from sessionStorage to console
 */
export const debugInvitations = (): void => {
  try {
    console.log("--- DEBUG INVITATIONS ---");
    
    // Check sessionStorage for temporary invitation data
    console.log("currentActiveInvitationId:", sessionStorage.getItem('currentActiveInvitationId'));
    console.log("pendingInvitationId:", sessionStorage.getItem('pendingInvitationId'));
    console.log("pendingInvitationAccountId:", sessionStorage.getItem('pendingInvitationAccountId'));
    console.log("pendingInvitationOwnerId:", sessionStorage.getItem('pendingInvitationOwnerId'));
    
    // Check if there are any details in sessionStorage
    const currentInvDetails = sessionStorage.getItem('currentInvitationDetails');
    if (currentInvDetails) {
      try {
        console.log("currentInvitationDetails:", JSON.parse(currentInvDetails));
      } catch (e) {
        console.log("Failed to parse currentInvitationDetails");
      }
    }
    
    console.log("------------------------");
  } catch (error) {
    console.error("Error in debugInvitations:", error);
  }
};
