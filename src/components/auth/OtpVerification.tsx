import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Smartphone, Shield, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useNavigate } from 'react-router-dom';
import { useConfetti } from '@/components/ui/confetti';
import { CelebrationModal } from '@/components/ui/celebration-modal';

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
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(120); // 2 minutes
  const [error, setError] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const { isActive: confettiActive, fire: fireConfetti, ConfettiComponent } = useConfetti();

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

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single digit
    
    setError('');
    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);

    // Auto-focus next input (moving forward in array order)
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement;
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`) as HTMLInputElement;
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
    
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('').slice(0, 6); // Keep original order
      setOtpCode(newOtp);
      setError('');
      
      // Focus first input after paste
      const firstInput = document.getElementById('otp-5') as HTMLInputElement;
      firstInput?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otpCode.join(''); // Keep original order for verification
    console.log('OTP verification - phoneNumber:', phoneNumber, 'code:', code, 'otpCode array:', otpCode);
    
    if (code.length !== 6) {
      setError('אנא הזן קוד בן 6 ספרות');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      await loginWithPhone(phoneNumber, code);
      
      // Success celebration
      fireConfetti();
      setShowCelebration(true);
      
    } catch (error: any) {
      console.error('OTP verification failed:', error);
      setError('קוד שגוי או פג תוקף');
      
      // Clear OTP inputs on error
      setOtpCode(['', '', '', '', '', '']);
      const firstInput = document.getElementById('otp-0') as HTMLInputElement;
      firstInput?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResending(true);
    setError('');
    
    try {
      await sendPhoneOtp(phoneNumber);
      setCountdown(120); // Reset countdown
      setOtpCode(['', '', '', '', '', '']); // Clear current OTP
      
      const firstInput = document.getElementById('otp-0') as HTMLInputElement;
      firstInput?.focus();
      
      // Show success message
      alert('קוד חדש נשלח למספר הטלפון שלך');
    } catch (error) {
      console.error('Failed to resend OTP:', error);
      alert('שגיאה בשליחת קוד חדש');
    } finally {
      setIsResending(false);
    }
  };

  const handleCelebrationClose = () => {
    setShowCelebration(false);
    onSuccess();
    navigate('/dashboard');
  };

  return (
    <>
      <Card className="border-border shadow-lg animate-fade-in glass">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-6 h-6 text-green-500" />
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              אימות קוד
            </CardTitle>
          </div>
          <CardDescription>
            נשלח קוד אימות למספר {displayNumber}
            <br />
            {userInfo.userName && (
              <span className="text-primary font-medium">שלום {userInfo.userName}! 👋</span>
            )}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* OTP Input Fields */}
          <div className="space-y-4">
            <div className="flex justify-center gap-3" onPaste={handlePaste}>
              {otpCode.map((digit, index) => (
                <Input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`w-12 h-12 text-center text-xl font-bold border-2 transition-all duration-200 ${
                    digit ? 'border-primary shadow-glow' : 'border-muted'
                  } ${error ? 'border-destructive' : ''} focus:border-primary focus:shadow-glow`}
                />
              ))}
            </div>
            
            {error && (
              <p className="text-center text-sm text-destructive animate-fade-in">{error}</p>
            )}
          </div>

          {/* Timer */}
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="text-sm">
              {countdown > 0 ? `הקוד יפוג בעוד ${formatTime(countdown)}` : 'הקוד פג תוקף'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={handleVerifyOtp}
              disabled={isVerifying || otpCode.join('').length !== 6 || countdown === 0}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold py-3 text-lg shadow-lg transform transition-all duration-200 hover:scale-105 disabled:transform-none"
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
              disabled={isResending || countdown > 60} // Allow resend only after 1 minute
              className="w-full"
            >
              {isResending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                  שולח שוב...
                </span>
              ) : countdown > 60 ? (
                `שלח שוב בעוד ${formatTime(countdown - 60)}`
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
              className="w-full flex items-center gap-2 hover:bg-muted/50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              חזור להזנת מספר
            </Button>
          </div>

          {/* Security Notice */}
          <div className="text-center text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg">
            <p>🔒 לא תשתף את הקוד עם אחרים</p>
            <p>🕒 הקוד תקף רק למשך 10 דקות</p>
          </div>
        </CardContent>
      </Card>

      {/* Confetti Animation */}
      <ConfettiComponent duration={4000} particleCount={150} />

      {/* Success Celebration Modal */}
      <CelebrationModal
        isOpen={showCelebration}
        title="🎉 התחברת בהצלחה!"
        message="ברוכים הבאים! אתה מועבר עכשיו לדשבורד"
        onClose={handleCelebrationClose}
      />
    </>
  );
};

export default OtpVerification;