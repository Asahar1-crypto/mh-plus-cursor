
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';

// Hebrew text constants to avoid JSX parsing issues
const EMAIL_VERIFICATION_SUCCESS_MESSAGE = 'האימייל אומת בהצלחה!';
const EMAIL_VERIFICATION_ERROR_MESSAGE = 'אימות האימייל נכשל, אנא נסה שוב';
const PASSWORD_RESET_SUCCESS_MESSAGE = 'הוראות לאיפוס סיסמה נשלחו לאימייל שלך';
const PASSWORD_RESET_ERROR_MESSAGE = 'איפוס הסיסמה נכשל, אנא נסה שוב';

/**
 * Service for account verification and recovery operations
 */
export const accountVerificationService = {
  // Verify email function using custom verification endpoint
  verifyEmail: async (token: string, email?: string): Promise<boolean> => {
    try {
      console.log("Attempting to verify email with custom token");
      
      if (!email) {
        console.error("Email is required for verification");
        toast.error(EMAIL_VERIFICATION_ERROR_MESSAGE);
        return false;
      }
      
      // Call our custom verification function
      const { data, error } = await supabase.functions.invoke('verify-email', {
        body: {
          token,
          email
        }
      });
      
      if (error || !data?.success) {
        console.error("Email verification error:", error);
        toast.error(EMAIL_VERIFICATION_ERROR_MESSAGE);
        return false;
      }
      
      console.log("Email verification successful");
      toast.success(EMAIL_VERIFICATION_SUCCESS_MESSAGE);
      return true;
    } catch (error) {
      console.error('Failed to verify email:', error);
      toast.error(EMAIL_VERIFICATION_ERROR_MESSAGE);
      return false;
    }
  },

  // Reset password function
  resetPassword: async (email: string): Promise<void> => {
    try {
      console.log(`Attempting password reset for ${email}`);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) {
        console.error("Password reset error from Supabase:", error);
        throw error;
      }
      
      console.log("Password reset email sent");
      toast.success(PASSWORD_RESET_SUCCESS_MESSAGE);
    } catch (error) {
      console.error('Failed to reset password:', error);
      toast.error(PASSWORD_RESET_ERROR_MESSAGE);
      throw error;
    }
  }
};
