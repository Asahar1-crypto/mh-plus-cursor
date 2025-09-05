// OTP Service Types
export type OTPType = 
  | 'registration' 
  | 'family_registration' 
  | 'login' 
  | 'phone_change' 
  | 'password_reset';

export interface OTPRequest {
  phoneNumber: string;
  type: OTPType;
  userId?: string;
}

export interface OTPVerification {
  phoneNumber: string;
  code: string;
  type: OTPType;
}

export interface OTPResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

export interface OTPSendResponse extends OTPResponse {
  codeSent: boolean;
  expiresAt?: string;
}

export interface OTPVerifyResponse extends OTPResponse {
  verified: boolean;
  magicLink?: string;
  userId?: string;
}

export interface OTPState {
  isLoading: boolean;
  isResending: boolean;
  countdown: number;
  lastSentAt?: Date;
  attempts: number;
  maxAttempts: number;
}

export interface UseOTPResult {
  // State
  state: OTPState;
  
  // Actions
  sendOTP: (phoneNumber: string, type: OTPType) => Promise<OTPSendResponse>;
  verifyOTP: (phoneNumber: string, code: string, type: OTPType) => Promise<OTPVerifyResponse>;
  resendOTP: () => Promise<OTPSendResponse>;
  reset: () => void;
  
  // Helpers
  canResend: boolean;
  isValidCode: (code: string) => boolean;
}