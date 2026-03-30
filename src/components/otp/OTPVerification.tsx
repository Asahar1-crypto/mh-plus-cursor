import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useConfetti } from '@/components/ui/confetti';
import { CelebrationModal } from '@/components/ui/celebration-modal';
import { OTPInput } from './OTPInput';
import { useOTP } from '@/services/otp';
import { OTPType } from '@/services/otp/types';

interface OTPVerificationProps {
  phoneNumber: string;
  type: OTPType;
  onVerificationComplete: (verified: boolean, data?: any) => void;
  onBack?: () => void;
  autoSend?: boolean;
  title?: string;
  description?: string;
}

/**
 * Central OTP Verification Component
 * Handles the complete OTP verification flow
 */
export const OTPVerification: React.FC<OTPVerificationProps> = ({
  phoneNumber,
  type,
  onVerificationComplete,
  onBack,
  autoSend = true,
  title,
  description
}) => {
  const [otpCode, setOtpCode] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  
  const { isActive: confettiActive, fire: fireConfetti, ConfettiComponent } = useConfetti();
  const otpHook = useOTP(type);

  // Auto-send OTP on mount
  useEffect(() => {
    if (autoSend) {
      otpHook.sendOTP(phoneNumber, type);
    }
  }, [autoSend, phoneNumber, type]);

  const handleVerifyOTP = async () => {
    if (!otpHook.isValidCode(otpCode)) {
      return; // useOTP will show error toast
    }

    const result = await otpHook.verifyOTP(phoneNumber, otpCode, type);
    
    if (result.verified) {
      // Show celebration
      fireConfetti();
      setShowCelebration(true);
    }
  };

  const handleCelebrationClose = () => {
    setShowCelebration(false);
    onVerificationComplete(true); // Verification complete
  };

  const handleResendOTP = async () => {
    await otpHook.resendOTP();
    setOtpCode(''); // Clear current code
  };

  // Auto-verify when 6 digits are entered
  useEffect(() => {
    if (otpCode.length === 6) {
      handleVerifyOTP();
    }
  }, [otpCode]);

  const defaultTitle = (() => {
    switch (type) {
      case 'registration': return 'אימות מספר טלפון';
      case 'family_registration': return 'הצטרפות לחשבון משפחתי';
      case 'login': return 'התחברות עם טלפון';
      case 'phone_change': return 'שינוי מספר טלפון';
      case 'password_reset': return 'איפוס סיסמה';
      default: return 'אימות מספר טלפון';
    }
  })();

  const defaultDescription = `נשלח קוד אימות למספר ${phoneNumber}\nאנא הזן את הקוד בן 6 הספרות`;

  return (
    <>
      <ConfettiComponent />
      
      <Card className="border-border shadow-lg animate-fade-in">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {title || defaultTitle}
          </CardTitle>
          <CardDescription className="whitespace-pre-line">
            {description || defaultDescription}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* OTP Input */}
          <div className="space-y-4">
            <OTPInput
              value={otpCode}
              onChange={setOtpCode}
              disabled={otpHook.state.isLoading}
              autoFocus
              className="justify-center"
            />
            
            {/* Verify Button */}
            <Button
              onClick={handleVerifyOTP}
              disabled={
                otpHook.state.isLoading || 
                otpCode.length !== 6 || 
                !otpHook.isValidCode(otpCode)
              }
              className="w-full"
              size="lg"
            >
              {otpHook.state.isLoading ? 'מאמת...' : 'אמת קוד'}
            </Button>
          </div>

          {/* Resend Button */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              לא קיבלת קוד?
            </p>
            <Button
              variant="outline"
              onClick={handleResendOTP}
              disabled={
                otpHook.state.isResending || 
                !otpHook.canResend ||
                otpHook.state.attempts >= otpHook.state.maxAttempts
              }
              className="w-full"
            >
              {otpHook.state.isResending ? 'שולח...' : 
               otpHook.state.countdown > 0 ? `שלח שוב (${otpHook.state.countdown})` : 
               'שלח קוד שוב'}
            </Button>
            
            {otpHook.state.attempts >= otpHook.state.maxAttempts && (
              <p className="text-xs text-destructive">
                הגעת למספר המקסימלי של ניסיונות
              </p>
            )}
          </div>

          {/* Back Button */}
          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              className="w-full"
            >
              חזור
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Celebration Modal */}
      <CelebrationModal
        isOpen={showCelebration}
        onClose={handleCelebrationClose}
        title="מעולה! 🎉"
        message="המספר אומת בהצלחה!"
      />
    </>
  );
};