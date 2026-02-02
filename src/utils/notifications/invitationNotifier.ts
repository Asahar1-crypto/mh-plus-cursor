
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { InvitationNotificationData } from './types';

/**
 * Shows notification for a new invitation
 */
export const showInvitationNotification = (invitationId: string) => {
  // Get invitation details from Supabase
  const checkDatabaseInvitation = async () => {
    try {
      console.log(`Showing notification for invitation ID: ${invitationId}`);
      
      // Make sure this is still a valid invitation before showing notification
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          invitation_id,
          email,
          accounts:account_id (
            id,
            name,
            owner_id,
            profiles!owner_id (
              id,
              name
            )
          )
        `)
        .eq('invitation_id', invitationId)
        .is('accepted_at', null)
        .gt('expires_at', 'now()')
        .single();

      if (error || !data) {
        console.error("Could not find valid invitation in database:", error);
        return;
      }

      // Found invitation in database
      const ownerName = data.accounts?.profiles?.name || 'בעל החשבון';
      const accountName = data.accounts?.name || 'חשבון משותף';
      
      // Show notification
      toast.info(
        `יש לך הזמנה לחשבון משותף מ-${ownerName}!`,
        {
          description: `הוזמנת להצטרף לחשבון "${accountName}". לצפייה בהזמנה וקבלתה, לחץ על הכפתור למטה`,
          duration: 30000, // Longer duration for better visibility
          action: {
            label: "צפה בהזמנה",
            onClick: () => {
              // Phone invitations go to family-invitation page
              window.location.href = `/family-invitation?invitationId=${invitationId}`;
            }
          }
        }
      );
    } catch (error) {
      console.error('Error checking database invitation:', error);
    }
  };
  
  // Start checking with database
  checkDatabaseInvitation();
};

/**
 * Checks if there are pending invitations for the current user
 */
export const hasPendingInvitations = async (currentUserEmail?: string, currentUserPhone?: string): Promise<boolean> => {
  if (!currentUserEmail && !currentUserPhone) return false;
  
  try {
    // Build query to check both email and phone invitations
    let query = supabase
      .from('invitations')
      .select('invitation_id, email, phone_number')
      .is('accepted_at', null)
      .gt('expires_at', 'now()');
    
    // Check by email OR phone
    if (currentUserEmail && currentUserPhone) {
      query = query.or(`email.eq.${currentUserEmail.toLowerCase()},phone_number.eq.${currentUserPhone}`);
    } else if (currentUserEmail) {
      query = query.eq('email', currentUserEmail.toLowerCase());
    } else if (currentUserPhone) {
      query = query.eq('phone_number', currentUserPhone);
    }
    
    const { data, error } = await query;
    
    if (!error && data && data.length > 0) {
      console.log(`Found ${data.length} pending invitations in database for ${currentUserEmail || currentUserPhone}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to check pending invitations:', error);
    return false;
  }
};
