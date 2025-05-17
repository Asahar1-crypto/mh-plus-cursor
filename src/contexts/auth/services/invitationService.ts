
import { supabase } from "@/integrations/supabase/client";
import { User, Account } from '../types';
import { toast } from 'sonner';
import { sendInvitationEmail } from '@/utils/emailService';
import { Tables } from "@/integrations/supabase/types";

// Define local interfaces for data structures to avoid circular references
interface InvitationData {
  id: string;
  account_id: string;
  email: string;
  invitation_id: string;
}

// Use explicit type for invitation record from database
type InvitationRecord = {
  id: string;
  account_id: string;
  email: string;
  invitation_id: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
};

/**
 * Service for invitation-related operations
 */
export const invitationService = {
  // Send invitation function
  sendInvitation: async (email: string, user: User, account: Account) => {
    try {
      console.log(`Attempting to send invitation from ${user.name} to ${email} for account ${account.name}`);
      
      // Check if the email already exists as a user
      const { data: existingUserData } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
        
      const existingUserId = existingUserData?.id;
      console.log(`Existing user check for ${email}:`, existingUserId ? `Found user ${existingUserId}` : "No existing user");
      
      // Check if there's already an invitation for this email
      const { data: existingInvitations, error: checkError } = await supabase
        .from('invitations')
        .select('*')
        .eq('account_id', account.id)
        .eq('email', email)
        .is('accepted_at', null)
        .gt('expires_at', 'now()');
        
      if (checkError) {
        console.error("Error checking existing invitations:", checkError);
        throw checkError;
      }
      
      console.log(`Found ${existingInvitations?.length || 0} existing invitations for ${email}`);
      
      let invitationId;
      
      if (existingInvitations && existingInvitations.length > 0) {
        // Use the existing invitation
        console.log(`Invitation already exists for ${email}, reusing: ${existingInvitations[0].invitation_id}`);
        invitationId = existingInvitations[0].invitation_id;
      } else {
        // Generate a unique invitation ID
        invitationId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
        console.log(`Creating new invitation with ID ${invitationId}`);
        
        // Insert the invitation into Supabase
        const { error: insertError } = await supabase
          .from('invitations')
          .insert({
            account_id: account.id,
            email: email,
            invitation_id: invitationId
          });
          
        if (insertError) {
          console.error("Error inserting invitation:", insertError);
          throw insertError;
        }
      }
      
      // Build the invitation link
      const invitationLink = `${window.location.origin}/invitation/${invitationId}`;
      
      console.log(`Invitation link generated: ${invitationLink}`);
      
      // Send invitation email
      try {
        await sendInvitationEmail(
          email,
          invitationLink,
          user.name,
          account.name
        );
        
        console.log(`Invitation email sent to ${email}`);
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        toast.error('ההזמנה נוצרה אך שליחת האימייל נכשלה');
        // We continue even if email fails, as the invitation was created
      }
      
      // Store in localStorage for the demo
      try {
        const pendingInvitations = JSON.parse(localStorage.getItem('pendingInvitations') || '{}');
        pendingInvitations[invitationId] = {
          name: account.name,
          ownerName: user.name,
          sharedWithEmail: email,
          invitationId: invitationId
        };
        localStorage.setItem('pendingInvitations', JSON.stringify(pendingInvitations));
        console.log("Updated localStorage with invitation information");
      } catch (storageError) {
        console.error("Error updating localStorage:", storageError);
      }
      
      // Update the account object
      const updatedAccount: Account = {
        ...account,
        sharedWithEmail: email,
        invitationId: invitationId
      };

      // Update the account in the database to reference this invitation
      try {
        const { error: updateError } = await supabase
          .from('accounts')
          .update({ 
            shared_with_email: email,
            invitation_id: invitationId
          })
          .eq('id', account.id);
          
        if (updateError) {
          console.error("Error updating account with invitation data:", updateError);
          toast.error('ההזמנה נוצרה אך עדכון פרטי החשבון נכשל');
        }
      } catch (dbError) {
        console.error("Exception during account update:", dbError);
      }
      
      console.log("Invitation process completed successfully");
      return updatedAccount;
    } catch (error) {
      console.error('Failed to send invitation:', error);
      toast.error('שליחת ההזמנה נכשלה, אנא נסה שוב');
      throw error;
    }
  },

  // Remove invitation function
  removeInvitation: async (account: Account) => {
    try {
      console.log("Removing invitation from account:", account);
      
      // In a real implementation with Supabase, we'd mark the invitation as deleted or remove it
      if (account.invitationId) {
        // Remove the invitation from supabase
        const { error } = await supabase
          .from('invitations')
          .update({ accepted_at: null }) // Set to null to indicate it was revoked
          .eq('invitation_id', account.invitationId);
          
        if (error) {
          console.error("Error updating invitation:", error);
          throw error;
        }
        
        // Remove from localStorage for the demo
        try {
          const pendingInvitations = JSON.parse(localStorage.getItem('pendingInvitations') || '{}');
          delete pendingInvitations[account.invitationId];
          localStorage.setItem('pendingInvitations', JSON.stringify(pendingInvitations));
          console.log("Removed invitation from localStorage");
        } catch (storageError) {
          console.error("Error updating localStorage:", storageError);
        }
      }
      
      // Update the account in Supabase if there's a shared user
      if (account.sharedWithId || account.sharedWithEmail || account.invitationId) {
        const { error } = await supabase
          .from('accounts')
          .update({ 
            shared_with_id: null,
            shared_with_email: null,
            invitation_id: null
          })
          .eq('id', account.id);
          
        if (error) {
          console.error("Error updating account:", error);
          throw error;
        }
        console.log("Account updated to remove sharing information");
      }
      
      // Return the updated account object
      const updatedAccount: Account = {
        ...account,
        sharedWithId: undefined,
        sharedWithEmail: undefined,
        invitationId: undefined
      };
      
      console.log("Invitation removal completed successfully");
      return updatedAccount;
    } catch (error) {
      console.error('Failed to remove invitation:', error);
      toast.error('הסרת השותף נכשלה, אנא נסה שוב');
      throw error;
    }
  },

  // Accept invitation function
  acceptInvitation: async (invitationId: string, user: User) => {
    try {
      console.log(`User ${user.id} (${user.email}) attempting to accept invitation ${invitationId}`);
      
      // Find the invitation in Supabase
      const { data: invitations, error: findError } = await supabase
        .from('invitations')
        .select('*')
        .eq('invitation_id', invitationId)
        .is('accepted_at', null)
        .gt('expires_at', 'now()')
        .limit(1);
        
      if (findError) {
        console.error("Error finding invitation:", findError);
        throw findError;
      }
      
      if (!invitations || invitations.length === 0) {
        console.error("Invitation not found or expired");
        throw new Error('ההזמנה לא נמצאה או שפג תוקפה');
      }
      
      const invitation = invitations[0] as InvitationRecord;
      console.log("Found invitation:", invitation);
      
      // Validate that the invitation is for this user
      if (invitation.email !== user.email) {
        console.error(`Email mismatch: invitation for ${invitation.email} but user is ${user.email}`);
        throw new Error(`ההזמנה מיועדת ל-${invitation.email} אך אתה מחובר כ-${user.email}`);
      }
      
      // Get the account details
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', invitation.account_id)
        .single();
        
      if (accountError) {
        console.error("Error finding account:", accountError);
        throw accountError;
      }
      
      console.log("Found account:", accountData);
      
      // Update the account to add the shared user
      const { error: updateError } = await supabase
        .from('accounts')
        .update({ 
          shared_with_id: user.id,
          shared_with_email: user.email
        })
        .eq('id', invitation.account_id);
        
      if (updateError) {
        console.error("Error updating account:", updateError);
        throw updateError;
      }
      
      // Mark the invitation as accepted
      const { error: acceptError } = await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);
        
      if (acceptError) {
        console.error("Error marking invitation as accepted:", acceptError);
        throw acceptError;
      }
      
      // Create account object to return
      const account: Account = {
        id: accountData.id,
        name: accountData.name,
        ownerId: accountData.owner_id,
        sharedWithId: user.id,
        sharedWithEmail: user.email,
        invitationId: invitationId
      };
      
      // Remove from localStorage for the demo
      try {
        const pendingInvitations = JSON.parse(localStorage.getItem('pendingInvitations') || '{}');
        delete pendingInvitations[invitationId];
        localStorage.setItem('pendingInvitations', JSON.stringify(pendingInvitations));
        console.log("Removed accepted invitation from localStorage");
      } catch (storageError) {
        console.error("Error updating localStorage:", storageError);
      }
      
      console.log("Invitation acceptance completed successfully");
      toast.success('הצטרפת לחשבון בהצלחה!');
      return account;
    } catch (error: any) {
      console.error('Failed to accept invitation:', error);
      toast.error(error.message || 'קבלת ההזמנה נכשלה, אנא נסה שוב');
      throw error;
    }
  },
};
