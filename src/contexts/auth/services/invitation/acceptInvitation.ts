import { supabase } from "@/integrations/supabase/client";
import { User, Account } from '../../types';
import { toast } from 'sonner';
import { InvitationRecord, AccountRecord, PendingInvitationRecord } from './types';
import { removePendingInvitation } from '@/utils/notifications';

/**
 * Accepts an invitation and updates the account
 */
export async function acceptInvitation(invitationId: string, user: User): Promise<Account> {
  try {
    console.log(`User ${user.id} (${user.email}) attempting to accept invitation ${invitationId}`);
    
    // First try to get the invitation from the database
    const { data: invitationData, error: findError } = await supabase
      .from('invitations')
      .select('id, account_id, email, invitation_id, accepted_at, expires_at')
      .eq('invitation_id', invitationId)
      .is('accepted_at', null)
      .gt('expires_at', 'now()')
      .single();
      
    if (findError || !invitationData) {
      console.warn("Could not find invitation in database, checking localStorage:", findError);
      
      // Try to get invitation details from localStorage as backup
      const pendingInvitationsData = localStorage.getItem('pendingInvitations');
      if (!pendingInvitationsData) {
        console.error("No pending invitations found in localStorage");
        throw new Error('ההזמנה לא נמצאה או שפג תוקפה');
      }
      
      try {
        const pendingInvitations = JSON.parse(pendingInvitationsData) as Record<string, PendingInvitationRecord>;
        const localInvitation = pendingInvitations[invitationId];
        
        if (!localInvitation) {
          console.error(`Invitation ${invitationId} not found in localStorage`);
          throw new Error('ההזמנה לא נמצאה או שפג תוקפה');
        }
        
        console.log("Found invitation in localStorage:", localInvitation);
        
        // Case insensitive comparison for email
        if (localInvitation.sharedWithEmail && 
            localInvitation.sharedWithEmail.toLowerCase() !== user.email.toLowerCase()) {
          console.error(`Email mismatch: invitation for ${localInvitation.sharedWithEmail} but user is ${user.email}`);
          throw new Error(`ההזמנה מיועדת ל-${localInvitation.sharedWithEmail} אך אתה מחובר כ-${user.email}`);
        }
        
        // Get accountId from localStorage
        const accountId = localInvitation.accountId;
        
        if (!accountId) {
          console.error("Missing accountId in localStorage invitation");
          throw new Error('חסר מידע חיוני להצטרפות לחשבון, אנא בקש הזמנה חדשה');
        }
        
        // Fetch account information
        const { data: accountData, error: accountError } = await supabase
          .from('accounts')
          .select('*')
          .eq('id', accountId)
          .single();
          
        if (accountError || !accountData) {
          console.error("Error finding account:", accountError);
          throw new Error('החשבון לא נמצא, אנא בקש הזמנה חדשה');
        }
        
        console.log("Found account:", accountData);
        
        // Check if this account already belongs to the current user
        if (accountData.owner_id === user.id) {
          console.error("Cannot share account with self");
          throw new Error('לא ניתן לשתף חשבון עם עצמך');
        }
        
        // Update the account to link with the current user
        const { error: updateError } = await supabase
          .from('accounts')
          .update({ 
            shared_with_id: user.id,
            shared_with_email: user.email,
            invitation_id: invitationId
          })
          .eq('id', accountId);
          
        if (updateError) {
          console.error("Error updating account:", updateError);
          throw updateError;
        }
        
        // Try to mark the invitation as accepted in the database
        try {
          await supabase
            .from('invitations')
            .update({ accepted_at: new Date().toISOString() })
            .eq('invitation_id', invitationId);
        } catch (acceptError) {
          // Just log this error but don't fail the process
          console.warn("Could not mark invitation as accepted in database, but account was updated");
        }

        // Get owner name
        let ownerName = localInvitation.ownerName || 'בעל החשבון';
        
        if (accountData.owner_id) {
          const { data: ownerData } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', accountData.owner_id)
            .single();
            
          if (ownerData) {
            ownerName = ownerData.name;
          }
        }
        
        // Create account object to return
        const sharedAccount: Account = {
          id: accountId,
          name: accountData.name || localInvitation.name || 'חשבון משותף',
          ownerId: accountData.owner_id,
          ownerName: ownerName,
          sharedWithId: user.id,
          sharedWithEmail: user.email,
          invitationId: invitationId,
          isSharedAccount: true
        };
        
        // Clean up localStorage and sessionStorage
        removePendingInvitation(invitationId);
        sessionStorage.removeItem('pendingInvitationAccountId');
        sessionStorage.removeItem('pendingInvitationOwnerId');
        
        console.log("Invitation accepted successfully (localStorage path)");
        toast.success('הצטרפת לחשבון בהצלחה!');
        return sharedAccount;
      } catch (error) {
        console.error("Error processing invitation from localStorage:", error);
        throw error;
      }
    }
    
    // Process invitation data from the database
    // ... keep existing code (database flow for accepting invitation)
    
    return sharedAccount; // This is defined in the existing code
  } catch (error: any) {
    console.error('Failed to accept invitation:', error);
    toast.error(error.message || 'קבלת ההזמנה נכשלה, אנא נסה שוב');
    throw error;
  }
}
