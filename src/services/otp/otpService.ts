import { supabase } from '@/integrations/supabase/client';
import { OTPRequest, OTPVerification, OTPSendResponse, OTPVerifyResponse, OTPType } from './types';

/**
 * Central OTP Service - Manages all OTP operations
 */
export class OTPService {
  private static instance: OTPService;
  
  // Singleton pattern for consistent state
  public static getInstance(): OTPService {
    if (!OTPService.instance) {
      OTPService.instance = new OTPService();
    }
    return OTPService.instance;
  }

  /**
   * Send OTP code to phone number
   */
  async sendOTP(request: OTPRequest): Promise<OTPSendResponse> {
    try {
      
      const { data, error } = await supabase.functions.invoke('otp-send', {
        body: request
      });

      if (error) {
        console.error('OTPService: Send OTP error:', error);
        return {
          success: false,
          codeSent: false,
          error: error.message || 'שגיאה בשליחת קוד האימות'
        };
      }

      return {
        success: true,
        codeSent: true,
        message: data?.message || 'קוד האימות נשלח בהצלחה',
        expiresAt: data?.expiresAt,
        data
      };

    } catch (error: any) {
      console.error('OTPService: Send OTP exception:', error);
      return {
        success: false,
        codeSent: false,
        error: error.message || 'שגיאה פנימית'
      };
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(verification: OTPVerification): Promise<OTPVerifyResponse> {
    try {
      
      const { data, error } = await supabase.functions.invoke('otp-verify', {
        body: verification
      });

      if (error) {
        console.error('OTPService: Verify OTP error:', error);
        return {
          success: false,
          verified: false,
          error: error.message || 'קוד אימות שגוי או פג תוקף'
        };
      }

      if (!data?.verified) {
        return {
          success: false,
          verified: false,
          error: data?.error || 'קוד אימות שגוי או פג תוקף'
        };
      }

      return {
        success: true,
        verified: true,
        message: data?.message || 'הקוד אומת בהצלחה',
        magicLink: data?.magicLink,
        userId: data?.userId,
        data
      };

    } catch (error: any) {
      console.error('OTPService: Verify OTP exception:', error);
      return {
        success: false,
        verified: false,
        error: error.message || 'שגיאה פנימית'
      };
    }
  }

  /**
   * Validate OTP code format
   */
  isValidCode(code: string): boolean {
    return /^\d{6}$/.test(code);
  }

  /**
   * Get time until can resend (in seconds)
   */
  getResendCooldown(lastSentAt: Date, cooldownSeconds: number = 60): number {
    const elapsed = Math.floor((Date.now() - lastSentAt.getTime()) / 1000);
    return Math.max(0, cooldownSeconds - elapsed);
  }

  /**
   * Check if can resend OTP
   */
  canResend(lastSentAt?: Date, cooldownSeconds: number = 60): boolean {
    if (!lastSentAt) return true;
    return this.getResendCooldown(lastSentAt, cooldownSeconds) === 0;
  }

  /**
   * Normalize phone number for OTP operations
   */
  normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Handle Israeli phone numbers
    if (cleaned.startsWith('0')) {
      cleaned = '+972' + cleaned.substring(1);
    } else if (cleaned.startsWith('972')) {
      cleaned = '+' + cleaned;
    } else if (!cleaned.startsWith('+')) {
      cleaned = '+972' + cleaned;
    }
    
    return cleaned;
  }
}

// Export singleton instance
export const otpService = OTPService.getInstance();