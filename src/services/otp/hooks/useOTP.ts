import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { otpService } from '../otpService';
import { OTPType, UseOTPResult, OTPState, OTPSendResponse, OTPVerifyResponse } from '../types';

const RESEND_COOLDOWN = 60; // seconds
const MAX_ATTEMPTS = 5;

/**
 * Central OTP Hook - Manages OTP state and operations
 */
export function useOTP(type: OTPType): UseOTPResult {
  const [state, setState] = useState<OTPState>({
    isLoading: false,
    isResending: false,
    countdown: 0,
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS
  });

  const phoneNumberRef = useRef<string>('');
  const intervalRef = useRef<NodeJS.Timeout>();

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (state.countdown > 0) {
      intervalRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          countdown: Math.max(0, prev.countdown - 1)
        }));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.countdown]);

  /**
   * Send OTP
   */
  const sendOTP = useCallback(async (phoneNumber: string, otpType: OTPType): Promise<OTPSendResponse> => {
    if (state.attempts >= MAX_ATTEMPTS) {
      const error = 'הגעת למספר המקסימלי של ניסיונות';
      toast.error(error);
      return { success: false, codeSent: false, error };
    }

    setState(prev => ({ ...prev, isLoading: true }));
    phoneNumberRef.current = phoneNumber;

    try {
      const normalizedPhone = otpService.normalizePhoneNumber(phoneNumber);
      const response = await otpService.sendOTP({
        phoneNumber: normalizedPhone,
        type: otpType
      });

      if (response.success) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          lastSentAt: new Date(),
          countdown: RESEND_COOLDOWN,
          attempts: prev.attempts + 1
        }));
        toast.success(response.message || 'קוד האימות נשלח בהצלחה');
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
        toast.error(response.error || 'שגיאה בשליחת קוד האימות');
      }

      return response;
    } catch (error: any) {
      setState(prev => ({ ...prev, isLoading: false }));
      const errorMessage = error.message || 'שגיאה בשליחת קוד האימות';
      toast.error(errorMessage);
      return { success: false, codeSent: false, error: errorMessage };
    }
  }, [state.attempts]);

  /**
   * Verify OTP
   */
  const verifyOTP = useCallback(async (phoneNumber: string, code: string, otpType: OTPType): Promise<OTPVerifyResponse> => {
    if (!otpService.isValidCode(code)) {
      const error = 'אנא הזן קוד אימות תקין (6 ספרות)';
      toast.error(error);
      return { success: false, verified: false, error };
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const normalizedPhone = otpService.normalizePhoneNumber(phoneNumber);
      const response = await otpService.verifyOTP({
        phoneNumber: normalizedPhone,
        code,
        type: otpType
      });

      setState(prev => ({ ...prev, isLoading: false }));

      if (response.success) {
        toast.success(response.message || 'הקוד אומת בהצלחה! 🎉');
      } else {
        toast.error(response.error || 'קוד אימות שגוי או פג תוקף');
      }

      return response;
    } catch (error: any) {
      setState(prev => ({ ...prev, isLoading: false }));
      const errorMessage = error.message || 'שגיאה באימות הקוד';
      toast.error(errorMessage);
      return { success: false, verified: false, error: errorMessage };
    }
  }, []);

  /**
   * Resend OTP
   */
  const resendOTP = useCallback(async (): Promise<OTPSendResponse> => {
    if (!phoneNumberRef.current) {
      const error = 'מספר טלפון לא זמין לשליחה מחדש';
      toast.error(error);
      return { success: false, codeSent: false, error };
    }

    if (state.countdown > 0) {
      const error = `אנא המתן ${state.countdown} שניות לפני שליחה מחדש`;
      toast.error(error);
      return { success: false, codeSent: false, error };
    }

    setState(prev => ({ ...prev, isResending: true }));

    try {
      const response = await sendOTP(phoneNumberRef.current, type);
      return response;
    } finally {
      setState(prev => ({ ...prev, isResending: false }));
    }
  }, [state.countdown, sendOTP, type]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setState({
      isLoading: false,
      isResending: false,
      countdown: 0,
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS
    });
    phoneNumberRef.current = '';
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  /**
   * Computed values
   */
  const canResend = state.countdown === 0 && state.attempts < MAX_ATTEMPTS;
  const isValidCode = otpService.isValidCode;

  return {
    state,
    sendOTP,
    verifyOTP,
    resendOTP,
    reset,
    canResend,
    isValidCode
  };
}