import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { normalizeILPhoneNumber } from '@/utils/phoneUtils';

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
      
      // Normalize phone number before sending
      const normalizationResult = normalizeILPhoneNumber(phoneNumber);
      if (!normalizationResult.success) {
        throw new Error(normalizationResult.error || 'Invalid phone number format');
      }
      
      const { data, error } = await supabase.functions.invoke('phone-login', {
        body: { phoneNumber: normalizationResult.data!.e164 }
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
        toast.error('מספר הטלפון לא רשום במערכת. אנא הירשם תחילה.');
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
  verifyPhoneLoginOtp: async (phoneNumber: string, code: string): Promise<{ success: boolean; session?: any }> => {
    try {
      console.log(`Verifying login OTP for: ${phoneNumber}`);
      
      // Normalize phone number before verifying
      const normalizationResult = normalizeILPhoneNumber(phoneNumber);
      if (!normalizationResult.success) {
        throw new Error(normalizationResult.error || 'Invalid phone number format');
      }
      
      const { data, error } = await supabase.functions.invoke('verify-sms-code', {
        body: { 
          phoneNumber: normalizationResult.data!.e164, 
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
        session: data.session
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

  phoneLogin: async (phoneNumber: string, otp: string): Promise<{ userId: string; email: string }> => {
    try {
      console.log(`Completing phone login for: ${phoneNumber}`);
      
      const result = await phoneAuthService.verifyPhoneLoginOtp(phoneNumber, otp);
      
      if (!result.success) {
        throw new Error('Failed to verify OTP');
      }

      // If we got session tokens, use them directly
      if (result.session && result.session.access_token) {
        console.log('Setting session from tokens');
        
        // Import supabase here to avoid circular dependencies
        const { supabase } = await import('@/integrations/supabase/client');
        
        // Set the session using the tokens
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token
        });
        
        if (sessionError) {
          console.error('Error setting session:', sessionError);
          throw new Error('Failed to create session');
        }
        
        console.log('Session set successfully:', sessionData.session?.user?.id);
        
        return {
          userId: sessionData.session?.user?.id || 'authenticated',
          email: sessionData.session?.user?.email || 'authenticated'
        };
      }
      
      throw new Error('No session tokens received');
      
    } catch (error: any) {
      console.error('Phone login failed:', error);
      throw error;
    }
  }
};