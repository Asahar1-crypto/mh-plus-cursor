import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Smartphone, Shield, Clock, RefreshCw, CheckCircle2 } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { useAuth } from '@/contexts/auth';
import { useNavigate } from 'react-router-dom';
import { useConfetti } from '@/components/ui/confetti';
import { CelebrationModal } from '@/components/ui/celebration-modal';
import { REGEXP_ONLY_DIGITS } from 'input-otp';

interface OtpVerificationProps {
  phoneNumber: string;
  displayNumber: string;
  userInfo: { userId?: string; userName?: string };
  onBack: () => void;
  onSuccess: () => void;
}

const OtpVerification: React.FC<OtpVerificationProps> = ({
  phoneNumber,
  displayNumber,
  userInfo,
  onBack,
  onSuccess
}) => {
  const { loginWithPhone, sendPhoneOtp, isLoading } = useAuth();
  const navigate = useNavigate();
  const [otpValue, setOtpValue] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(120);
  const [error, setError] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const { fire: fireConfetti, ConfettiComponent } = useConfetti();

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerifyOtp = useCallback(async (code: string) => {
    console.log('OTP verification - phoneNumber:', phoneNumber, 'code:', code);
    
    if (code.length !== 6) {
      setError('אנא הזן קוד בן 6 ספרות');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      await loginWithPhone(phoneNumber, code);
      fireConfetti();
      setShowCelebration(true);
    } catch (error: any) {
      console.error('OTP verification failed:', error);
      setError('קוד שגוי או פג תוקף. נסה שנית.');
      setOtpValue('');
    } finally {
      setIsVerifying(false);
    }
  }, [phoneNumber, loginWithPhone, fireConfetti]);

  // Auto-verify when all 6 digits are entered
  const handleOtpChange = useCallback((value: string) => {
    setError('');
    setOtpValue(value);
    
    if (value.length === 6) {
      handleVerifyOtp(value);
    }
  }, [handleVerifyOtp]);

  const handleResendOtp = async () => {
    setIsResending(true);
    setError('');
    setResendSuccess(false);
    
    try {
      await sendPhoneOtp(phoneNumber);
      setCountdown(120);
      setOtpValue('');
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to resend OTP:', error);
      setError('שגיאה בשליחת קוד חדש');
    } finally {
      setIsResending(false);
    }
  };

  const handleCelebrationClose = () => {
    setShowCelebration(false);
    onSuccess();
    navigate('/dashboard');
  };

  // Timer progress for visual indicator
  const timerProgress = (countdown / 120) * 100;

  return (
    <>
      <Card className="border-border shadow-lg animate-fade-in glass overflow-hidden">
        {/* Progress bar for timer */}
        <div className="h-1 w-full bg-muted/30">
          <div 
            className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-1000 ease-linear"
            style={{ width: `${timerProgress}%` }}
          />
        </div>

        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-6 h-6 text-green-500" />
            <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              אימות קוד
            </CardTitle>
          </div>
          <CardDescription className="text-sm sm:text-base">
            <span>נשלח קוד אימות למספר</span>
            <br />
            <span className="font-mono text-base sm:text-lg font-semibold text-foreground tracking-wider" dir="ltr">
              {displayNumber}
            </span>
            {userInfo.userName && (
              <>
                <br />
                <span className="text-primary font-medium">שלום {userInfo.userName}!</span>
              </>
            )}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-5 px-4 sm:px-6">
          {/* OTP Input - using input-otp library */}
          <div className="space-y-3">
            <div className="flex justify-center" dir="ltr">
              <InputOTP
                maxLength={6}
                value={otpValue}
                onChange={handleOtpChange}
                disabled={isVerifying || countdown === 0}
                pattern={REGEXP_ONLY_DIGITS}
                autoFocus
                containerClassName="gap-1 sm:gap-2 justify-center"
              >
                <InputOTPGroup className="gap-1 sm:gap-1.5">
                  <InputOTPSlot index={0} className={error ? 'border-destructive' : ''} />
                  <InputOTPSlot index={1} className={error ? 'border-destructive' : ''} />
                  <InputOTPSlot index={2} className={error ? 'border-destructive' : ''} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup className="gap-1 sm:gap-1.5">
                  <InputOTPSlot index={3} className={error ? 'border-destructive' : ''} />
                  <InputOTPSlot index={4} className={error ? 'border-destructive' : ''} />
                  <InputOTPSlot index={5} className={error ? 'border-destructive' : ''} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            
            {/* Error message */}
            {error && (
              <p className="text-center text-sm text-destructive animate-fade-in font-medium">{error}</p>
            )}

            {/* Resend success message */}
            {resendSuccess && (
              <div className="flex items-center justify-center gap-2 text-green-600 animate-fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <p className="text-sm font-medium">קוד חדש נשלח בהצלחה!</p>
              </div>
            )}
          </div>

          {/* Timer */}
          <div className="flex items-center justify-center gap-2">
            <Clock className={`w-4 h-4 ${countdown <= 30 ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
            <span className={`text-sm font-medium ${countdown <= 30 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {countdown > 0 ? `הקוד יפוג בעוד ${formatTime(countdown)}` : 'הקוד פג תוקף'}
            </span>
          </div>

          {/* Auto-verify indicator */}
          {isVerifying && (
            <div className="flex items-center justify-center gap-2 py-2 animate-fade-in">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-r-transparent" />
              <span className="text-sm font-medium text-primary">מאמת את הקוד...</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-1">
            {/* Manual verify button - shown when auto-verify didn't trigger */}
            <Button 
              onClick={() => handleVerifyOtp(otpValue)}
              disabled={isVerifying || otpValue.length !== 6 || countdown === 0}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold py-3 h-12 sm:h-14 text-base sm:text-lg shadow-lg transform transition-all duration-200 hover:scale-[1.02] disabled:transform-none rounded-xl"
            >
              {isVerifying ? (
                <span className="flex items-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
                  מאמת...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  אמת והיכנס
                </span>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleResendOtp}
              disabled={isResending || countdown > 60}
              className="w-full h-11 sm:h-12 rounded-xl text-sm sm:text-base"
            >
              {isResending ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  שולח שוב...
                </span>
              ) : countdown > 60 ? (
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {`שלח שוב בעוד ${formatTime(countdown - 60)}`}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  שלח קוד שוב
                </span>
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={onBack}
              className="w-full flex items-center gap-2 hover:bg-muted/50 transition-colors h-10 sm:h-11 text-sm sm:text-base"
            >
              <ArrowLeft className="w-4 h-4" />
              חזור להזנת מספר
            </Button>
          </div>

          {/* Security Notice */}
          <div className="text-center text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl space-y-1">
            <p>הקוד מוזן אוטומטית עם ההקלדה - פשוט הקלד 6 ספרות</p>
            <p>ניתן גם להדביק קוד שהועתק מה-SMS</p>
          </div>
        </CardContent>
      </Card>

      {/* Confetti Animation */}
      <ConfettiComponent duration={4000} particleCount={150} />

      {/* Success Celebration Modal */}
      <CelebrationModal
        isOpen={showCelebration}
        title="התחברת בהצלחה!"
        message="ברוכים הבאים! אתה מועבר עכשיו לדשבורד"
        onClose={handleCelebrationClose}
      />
    </>
  );
};

export default OtpVerification;