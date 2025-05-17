
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';

// Hebrew text constants to avoid JSX parsing issues
const REGISTRATION_SUCCESS_MESSAGE = 'הרשמה בוצעה בהצלחה! אנא אמת את כתובת האימייל שלך.';
const EMAIL_ALREADY_REGISTERED_MESSAGE = 'כתובת האימייל כבר רשומה במערכת';
const GENERIC_REGISTRATION_ERROR_MESSAGE = 'ההרשמה נכשלה, אנא נסה שוב';

/**
 * Service for registration operations
 */
export const registrationService = {
  // Register function
  register: async (name: string, email: string, password: string) => {
    try {
      console.log(`Attempting registration for ${email} with name ${name}`);
      
      // Register with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name
          }
        }
      });
      
      if (error) {
        console.error("Registration error from Supabase:", error);
        throw error;
      }

      console.log("Registration successful, checking for pending invitations");

      // Check for pending invitations for this email
      const { data: invitations, error: invitationError } = await supabase
        .from('invitations')
        .select('*, accounts(*), accounts:accounts(owner_id, profiles:profiles(name))')
        .eq('email', email)
        .is('accepted_at', null)
        .gt('expires_at', 'now()');
        
      if (invitationError) {
        console.error('Error checking invitations:', invitationError);
      }

      // If there are pending invitations, store them for processing after email verification
      if (invitations && invitations.length > 0) {
        console.log(`Found ${invitations.length} pending invitations for ${email}:`, invitations);
        
        // Get any existing data
        const existingData = localStorage.getItem('pendingInvitationsAfterRegistration');
        let existingParsed = { email, invitations: [] };
        
        if (existingData) {
          try {
            existingParsed = JSON.parse(existingData);
          } catch (e) {
            console.error("Error parsing existing pendingInvitationsAfterRegistration:", e);
          }
        }
        
        // Store the invitations in localStorage so we can access them after verification
        localStorage.setItem('pendingInvitationsAfterRegistration', JSON.stringify({
          email,
          invitations: [
            ...existingParsed.invitations,
            ...invitations.map(inv => ({
              id: inv.id,
              accountId: inv.account_id,
              email: inv.email,
              invitationId: inv.invitation_id,
              accountName: inv.accounts?.name || 'חשבון משותף',
              ownerName: inv.accounts?.profiles?.name || 'בעל החשבון'
            }))
          ]
        }));
        
        console.log("Stored pending invitations for processing after email verification");
      } else {
        console.log(`No pending invitations found for ${email}`);
      }

      toast.success(REGISTRATION_SUCCESS_MESSAGE);
      return data;
    } catch (error: any) {
      console.error('Registration failed:', error);
      
      // Handle specific error codes
      if (error.message?.includes('already registered')) {
        toast.error(EMAIL_ALREADY_REGISTERED_MESSAGE);
      } else {
        toast.error(GENERIC_REGISTRATION_ERROR_MESSAGE);
      }
      
      throw error;
    }
  }
};
