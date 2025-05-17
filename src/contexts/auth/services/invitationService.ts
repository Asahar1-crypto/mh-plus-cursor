
import { supabase } from "@/integrations/supabase/client";
import { User, Account } from '../types';
import { toast } from 'sonner';
import { sendInvitationEmail } from '@/utils/emailService';

/**
 * Service for invitation-related operations
 */
export const invitationService = {
  // Send invitation function
  sendInvitation: async (email: string, user: User, account: Account) => {
    try {
      // Check if there's already an invitation for this email
      const { data: existingInvitations, error: checkError } = await supabase
        .from('invitations')
        .select('*')
        .eq('account_id', account.id)
        .eq('email', email)
        .is('accepted_at', null)
        .gt('expires_at', 'now()');
        
      if (checkError) throw checkError;
      
      let invitationId;
      
      if (existingInvitations && existingInvitations.length > 0) {
        // Use the existing invitation
        console.log(`Invitation already exists for ${email}, reusing: ${existingInvitations[0].invitation_id}`);
        invitationId = existingInvitations[0].invitation_id;
      } else {
        // Generate a unique invitation ID
        invitationId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
        // Insert the invitation into Supabase
        const { error: insertError } = await supabase
          .from('invitations')
          .insert({
            account_id: account.id,
            email: email,
            invitation_id: invitationId
          });
          
        if (insertError) throw insertError;
      }
      
      // Build the invitation link
      const invitationLink = `${window.location.origin}/invitation/${invitationId}`;
      
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
        // We continue even if email fails, as the invitation was created
      }
      
      // Store the invitation in localStorage for the demo
      const pendingInvitations = JSON.parse(localStorage.getItem('pendingInvitations') || '{}');
      pendingInvitations[invitationId] = {
        name: account.name,
        ownerName: user.name,
        sharedWithEmail: email,
        invitationId: invitationId
      };
      localStorage.setItem('pendingInvitations', JSON.stringify(pendingInvitations));
      
      // Update the account object
      const updatedAccount: Account = {
        ...account,
        sharedWithEmail: email,
        invitationId: invitationId
      };
      
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
      // In a real implementation with Supabase, we'd mark the invitation as deleted or remove it
      if (account.invitationId) {
        // Remove the invitation from supabase
        const { error } = await supabase
          .from('invitations')
          .update({ accepted_at: null }) // Set to null to indicate it was revoked
          .eq('invitation_id', account.invitationId);
          
        if (error) throw error;
        
        // Remove from localStorage for the demo
        const pendingInvitations = JSON.parse(localStorage.getItem('pendingInvitations') || '{}');
        delete pendingInvitations[account.invitationId];
        localStorage.setItem('pendingInvitations', JSON.stringify(pendingInvitations));
      }
      
      // Update the account in Supabase if there's a shared user
      if (account.sharedWithId) {
        const { error } = await supabase
          .from('accounts')
          .update({ shared_with_id: null })
          .eq('id', account.id);
          
        if (error) throw error;
      }
      
      // Return the updated account object
      const updatedAccount: Account = {
        ...account,
        sharedWithId: undefined,
        sharedWithEmail: undefined,
        invitationId: undefined
      };
      
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
      // Find the invitation in Supabase
      const { data: invitations, error: findError } = await supabase
        .from('invitations')
        .select('*')
        .eq('invitation_id', invitationId)
        .is('accepted_at', null)
        .gt('expires_at', 'now()')
        .limit(1);
        
      if (findError) throw findError;
      
      if (!invitations || invitations.length === 0) {
        throw new Error('ההזמנה לא נמצאה או שפג תוקפה');
      }
      
      const invitation = invitations[0];
      
      // Validate that the invitation is for this user
      if (invitation.email !== user.email) {
        throw new Error(`ההזמנה מיועדת ל-${invitation.email} אך אתה מחובר כ-${user.email}`);
      }
      
      // Get the account details
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', invitation.account_id)
        .single();
        
      if (accountError) throw accountError;
      
      // Update the account to add the shared user
      const { error: updateError } = await supabase
        .from('accounts')
        .update({ shared_with_id: user.id })
        .eq('id', invitation.account_id);
        
      if (updateError) throw updateError;
      
      // Mark the invitation as accepted
      const { error: acceptError } = await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);
        
      if (acceptError) throw acceptError;
      
      // Create account object to return
      const account: Account = {
        id: accountData.id,
        name: accountData.name,
        ownerId: accountData.owner_id,
        sharedWithId: user.id,
        invitationId: invitationId
      };
      
      // Remove from localStorage for the demo
      const pendingInvitations = JSON.parse(localStorage.getItem('pendingInvitations') || '{}');
      delete pendingInvitations[invitationId];
      localStorage.setItem('pendingInvitations', JSON.stringify(pendingInvitations));
      
      toast.success('הצטרפת לחשבון בהצלחה!');
      return account;
    } catch (error: any) {
      console.error('Failed to accept invitation:', error);
      toast.error(error.message || 'קבלת ההזמנה נכשלה, אנא נסה שוב');
      throw error;
    }
  },
};
