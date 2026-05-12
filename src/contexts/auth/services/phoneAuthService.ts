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
   * Verify OTP for phone login. Server returns a single-use magic-link
   * token_hash which the client consumes via supabase.auth.verifyOtp to
   * obtain a real session (admin.generateLink itself never returns tokens).
   */
  verifyPhoneLoginOtp: async (phoneNumber: string, code: string): Promise<{ success: boolean; token_hash?: string; email?: string }> => {
    try {
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

      return {
        success: true,
        token_hash: data.token_hash,
        email: data.email,
      };
    } catch (error: any) {
      console.error('Verify phone login OTP failed:', error);

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
    const result = await phoneAuthService.verifyPhoneLoginOtp(phoneNumber, otp);

    if (!result.success || !result.token_hash) {
      throw new Error('No verification token received');
    }

    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: result.token_hash,
      type: 'magiclink',
    });

    if (error || !data.session) {
      console.error('verifyOtp failed:', error);
      throw error ?? new Error('Failed to establish session');
    }

    return {
      userId: data.user?.id ?? 'authenticated',
      email: data.user?.email ?? result.email ?? '',
    };
  }
};