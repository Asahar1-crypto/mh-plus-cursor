// Export all OTP related functionality
export { otpService, OTPService } from './otpService';
export { useOTP } from './hooks/useOTP';
export type {
  OTPType,
  OTPRequest,
  OTPVerification,
  OTPResponse,
  OTPSendResponse,
  OTPVerifyResponse,
  OTPState,
  UseOTPResult
} from './types';