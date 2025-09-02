import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';

/**
 * Service for phone-based authentication
 */
export const phoneAuthService = {
  /**
   * Send OTP to phone number for login
   */
  sendPhoneLoginOtp: async (phoneNumber: string): Promise<{ success: boolean; userId?: string; userName?: string }> => {
    try {
      console.log(`Sending login OTP to: ${phoneNumber}`);
      
      const { data, error } = await supabase.functions.invoke('phone-login', {
        body: { phoneNumber }
      });

      if (error) {
        console.error('Error sending login OTP:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      console.log('Login OTP sent successfully');
      return {
        success: true,
        userId: data.userId,
        userName: data.userName
      };
    } catch (error: any) {
      console.error('Send phone login OTP failed:', error);
      
      // Handle specific error messages
      if (error.message?.includes('Phone number not registered')) {
        toast.error('מספר הטלפון לא רשום במערכת');
      } else if (error.message?.includes('Too many attempts')) {
        toast.error('יותר מדי נסיונות. נסה שוב מאוחר יותר');
      } else {
        toast.error('שגיאה בשליחת קוד האימות');
      }
      
      throw error;
    }
  },

  /**
   * Verify OTP for phone login
   */
  verifyPhoneLoginOtp: async (phoneNumber: string, code: string): Promise<{ success: boolean; sessionUrl?: string }> => {
    try {
      console.log(`Verifying login OTP for: ${phoneNumber}`);
      
      const { data, error } = await supabase.functions.invoke('verify-sms-code', {
        body: { 
          phoneNumber, 
          code,
          verificationType: 'login'
        }
      });

      if (error) {
        console.error('Error verifying login OTP:', error);
        throw error;
      }

      if (!data.verified) {
        throw new Error(data.error || 'Invalid verification code');
      }

      console.log('Login OTP verified successfully');
      return {
        success: true,
        sessionUrl: data.session?.sessionUrl
      };
    } catch (error: any) {
      console.error('Verify phone login OTP failed:', error);
      
      // Handle specific error messages
      if (error.message?.includes('Invalid or expired')) {
        toast.error('קוד אימות שגוי או פג תוקף');
      } else if (error.message?.includes('User authentication failed')) {
        toast.error('שגיאה באימות המשתמש');
      } else {
        toast.error('שגיאה באימות הקוד');
      }
      
      throw error;
    }
  },

  /**
   * Complete phone login process
   */
  phoneLogin: async (phoneNumber: string, otp: string): Promise<{ userId: string; email: string }> => {
    try {
      console.log(`Completing phone login for: ${phoneNumber}`);
      
      const result = await phoneAuthService.verifyPhoneLoginOtp(phoneNumber, otp);
      
      if (!result.success || !result.sessionUrl) {
        throw new Error('Failed to create session');
      }

      // Use the session URL to establish the session
      // This will redirect to the callback URL and establish the session
      console.log('Phone login completed successfully');
      
      // For now, we'll return placeholder data
      // In a full implementation, you'd parse the session URL or handle the redirect
      return {
        userId: 'temp-user-id', // This would come from the session
        email: 'temp@example.com' // This would come from the session
      };
      
    } catch (error: any) {
      console.error('Phone login failed:', error);
      throw error;
    }
  }
};