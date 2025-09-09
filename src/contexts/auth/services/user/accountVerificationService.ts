
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
  // Verify email function using Supabase built-in verification
  verifyEmail: async (token: string): Promise<boolean> => {
    try {
      console.log("Attempting to verify email with Supabase");
      
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email'
      });
      
      if (error) {
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

  resetPassword: async (email: string): Promise<void> => {
    console.log('🚀 accountVerificationService.resetPassword called with:', email);
    console.log('🚀 Stack trace:', new Error().stack);
    try {
      console.log(`Attempting password reset for ${email}`);
      
      // Check reset attempt limit
      const { data: canReset, error: limitError } = await supabase.rpc('check_reset_attempt_limit', {
        user_email: email
      });
      
      if (limitError) {
        console.error("Error checking reset limit:", limitError);
        throw new Error('שגיאה במערכת. אנא נסה שוב מאוחר יותר.');
      }
      
      if (!canReset) {
        throw new Error('חרגת ממספר הנסיונות המותר (3 נסיונות ב-30 דקות). אנא נסה שוב מאוחר יותר.');
      }
      
      // Get client IP and user agent for logging
      const clientIp = null; // Will be handled by Edge Function if needed
      const userAgent = navigator.userAgent;
      
      // Log the attempt
      const { error: logError } = await supabase.rpc('log_reset_attempt', {
        user_email: email,
        client_ip: clientIp,
        client_user_agent: userAgent
      });
      
      if (logError) {
        console.error("Error logging reset attempt:", logError);
        // Continue anyway - logging shouldn't block the process
      }
      
      // Use our custom edge function for password reset
      console.log('🔧 Calling send-password-reset edge function...');
      const { data, error } = await supabase.functions.invoke('send-password-reset', {
        body: { email }
      });
      
      console.log('🔧 Edge function response:', { data, error });
      
      if (error) {
        console.error("Password reset error from edge function:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        throw error;
      }
      
      console.log("🎯 Password reset email sent via edge function");
      toast.success(PASSWORD_RESET_SUCCESS_MESSAGE);
    } catch (error: any) {
      console.error('Failed to reset password:', error);
      
      // Show specific error message if it's a rate limit error
      if (error.message && error.message.includes('חרגת ממספר הנסיונות')) {
        toast.error(error.message);
      } else {
        toast.error(PASSWORD_RESET_ERROR_MESSAGE);
      }
      throw error;
    }
  }
};
