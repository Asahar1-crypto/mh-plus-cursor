
import { supabase } from "@/integrations/supabase/client";

/**
 * Clean up invalid invitations
 */
export const cleanupInvalidInvitation = async (invitationId: string): Promise<void> => {
  try {
    await supabase
      .from('invitations')
      .delete()
      .eq('invitation_id', invitationId);
  } catch (error) {
    console.error('Error cleaning up invalid invitation:', error);
  }
};
