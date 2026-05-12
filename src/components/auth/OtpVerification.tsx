import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useAuth } from '@/contexts/auth';
import { useNavigate } from 'react-router-dom';
import { useConfetti } from '@/components/ui/confetti';
import { CelebrationModal } from '@/components/ui/celebration-modal';
import { REGEXP_ONLY_DIGITS } from 'input-otp';

// Web OTP API typings (not in lib.dom.d.ts yet)
type OTPCredential = Credential & { code: string };

// OTP screen timing — keep in sync with phone-login edge function (10 min server TTL).
const OTP_TTL_SECONDS = 600;
const RESEND_COOLDOWN_SECONDS = 30;
const URGENT_THRESHOLD_SECONDS = 15;
const RESEND_UNLOCK_AT = OTP_TTL_SECONDS - RESEND_COOLDOWN_SECONDS;

// Stored once after the user's first successful login on this device, so we
// don't fire confetti + celebration modal on every return login.
const SEEN_CELEBRATION_KEY = 'mh_seen_login_celebration';

// sessionStorage key holding the unix-ms timestamp of the most recent OTP send.
// Written by AuthProvider.sendPhoneOtp; read here so the countdown survives
// page refresh and navigation away/back.
const OTP_ISSUED_AT_KEY = 'phoneLogin_otpIssuedAt';

const getRemainingSecondsFromStorage = (): number => {
  if (typeof window === 'undefined') return OTP_TTL_SECONDS;
  const raw = sessionStorage.getItem(OTP_ISSUED_AT_KEY);
  if (!raw) return OTP_TTL_SECONDS;
  const issuedAt = Number(raw);
  if (!Number.isFinite(issuedAt) || issuedAt <= 0) return OTP_TTL_SECONDS;
  const elapsed = Math.floor((Date.now() - issuedAt) / 1000);
  return Math.max(0, OTP_TTL_SECONDS - elapsed);
};

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
  const [countdown, setCountdown] = useState<number>(getRemainingSecondsFromStorage);
  const [error, setError] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const { fire: fireConfetti, ConfettiComponent } = useConfetti();
  // Tracks the last code we tried so we don't auto-resubmit the same wrong digits.
  const lastAttemptedCode = useRef<string>('');

  // Countdown timer — single source of truth is the sessionStorage timestamp,
  // so refresh / navigate-away / background tabs all stay accurate.
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(getRemainingSecondsFromStorage());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerifyOtp = useCallback(async (code: string) => {
    if (code.length !== 6) {
      setError('אנא הזן קוד בן 6 ספרות');
      return;
    }

    setIsVerifying(true);
    setError('');
    lastAttemptedCode.current = code;

    try {
      await loginWithPhone(phoneNumber, code);
      // Celebrate the first successful login on this device only — every
      // return login skips the confetti/modal and goes straight to dashboard.
      const isFirstTime = typeof window !== 'undefined' && !localStorage.getItem(SEEN_CELEBRATION_KEY);
      if (isFirstTime) {
        try { localStorage.setItem(SEEN_CELEBRATION_KEY, '1'); } catch { /* private mode: ignore */ }
        fireConfetti();
        setShowCelebration(true);
      } else {
        onSuccess();
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('OTP verification failed:', error);
      const raw = error?.context?.body || error?.message || '';
      let friendly = 'משהו השתבש. נסו שוב או בקשו קוד חדש.';
      if (typeof raw === 'string') {
        if (raw.includes('Invalid or expired') || raw.includes('פג תוקף') || raw.includes('שגוי')) {
          friendly = 'הקוד שגוי, נסו שוב.';
        } else if (raw.includes('Too many') || raw.includes('יותר מדי')) {
          friendly = 'יותר מדי ניסיונות. בקשו קוד חדש.';
        } else if (raw.includes('Failed to create session') || raw.includes('No verification token') || raw.includes('Failed to establish')) {
          friendly = 'התחברנו, אבל משהו השתבש בהפעלה. נסו שוב.';
        } else if (raw) {
          friendly = raw;
        }
      }
      setError(friendly);
      // Soft haptic on Android — Safari ignores this silently. Defensive call.
      try { navigator.vibrate?.(50); } catch { /* ignore */ }
      // Keep the digits so the user can fix one slot instead of retyping all six.
    } finally {
      setIsVerifying(false);
    }
  }, [phoneNumber, loginWithPhone, fireConfetti]);

  // Auto-verify when all 6 digits are entered. We skip re-firing on a value
  // identical to the last failed attempt (otherwise the user could be stuck
  // in an infinite verify loop if they edit then re-paste the same wrong code).
  const handleOtpChange = useCallback((value: string) => {
    setError('');
    setOtpValue(value);

    if (value.length === 6 && value !== lastAttemptedCode.current) {
      handleVerifyOtp(value);
    }
  }, [handleVerifyOtp]);

  // Web OTP API — Chrome on Android can read the incoming SMS directly when
  // the SMS body ends with `@<origin> #<code>`. iOS Safari uses the
  // autocomplete="one-time-code" path inside input-otp, no JS needed there.
  useEffect(() => {
    if (typeof window === 'undefined' || !('OTPCredential' in window)) return;
    if (countdown === 0 || isVerifying) return;

    const ac = new AbortController();
    (navigator.credentials as Credentials & {
      get: (o: { otp: { transport: string[] }; signal: AbortSignal }) => Promise<OTPCredential | null>;
    })
      .get({ otp: { transport: ['sms'] }, signal: ac.signal })
      .then((cred) => {
        if (cred?.code && /^\d{6}$/.test(cred.code)) {
          handleOtpChange(cred.code);
        }
      })
      .catch((err) => {
        // AbortError is expected on unmount / new SMS — ignore.
        if (err?.name !== 'AbortError') console.debug('WebOTP unavailable:', err);
      });

    return () => ac.abort();
  }, [countdown, isVerifying, handleOtpChange]);

  const handleResendOtp = async () => {
    setIsResending(true);
    setError('');
    setResendSuccess(false);
    
    try {
      await sendPhoneOtp(phoneNumber);
      setCountdown(OTP_TTL_SECONDS);
      setOtpValue('');
      lastAttemptedCode.current = '';
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

  const timerProgress = (countdown / OTP_TTL_SECONDS) * 100;
  const isUrgent = countdown > 0 && countdown <= URGENT_THRESHOLD_SECONDS;
  const isExpired = countdown === 0;
  const canResend = countdown <= RESEND_UNLOCK_AT;
  const resendCountdown = Math.max(0, countdown - RESEND_UNLOCK_AT);

  return (
    <>
      <Card className="relative border-border shadow-lg animate-fade-in glass overflow-hidden">
        {/* Progress bar for timer — ambient signal only, not announced to AT. */}
        <div className="h-1 w-full bg-muted/30" aria-hidden="true">
          <div
            className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-1000 ease-linear"
            style={{ width: `${timerProgress}%` }}
          />
        </div>

        {/* Back-to-phone as an icon button in the corner — tertiary action,
            doesn't compete with the input for attention. */}
        <button
          type="button"
          onClick={onBack}
          aria-label="שינוי מספר טלפון"
          className="absolute top-3 right-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowRight className="w-5 h-5" aria-hidden="true" />
        </button>

        <CardHeader className="text-center pt-8 pb-3 px-6">
          <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-1.5">
            אימות
          </CardTitle>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {userInfo.userName ? `שלום ${userInfo.userName}, ` : ''}שלחנו קוד בן 6 ספרות אל{' '}
            <bdi className="font-mono font-semibold text-foreground" dir="ltr">{displayNumber}</bdi>
          </p>
        </CardHeader>

        <CardContent className="space-y-5 px-4 sm:px-6 pb-6">
          {isExpired ? (
            /* Expired state — the input is dead, so replace the whole digit-
               entry area with a single prominent recovery CTA. */
            <div className="space-y-4 py-2 animate-fade-in">
              <p className="text-center text-sm sm:text-base text-muted-foreground">
                הקוד פג תוקף.
                <br />
                בקשו קוד חדש כדי להמשיך.
              </p>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isResending}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold h-12 sm:h-14 text-base sm:text-lg shadow-lg transition-transform duration-200 hover:scale-[1.02] disabled:opacity-70 disabled:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                    שולחים...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-5 w-5" aria-hidden="true" />
                    שלחו לי קוד חדש
                  </>
                )}
              </button>
            </div>
          ) : (
            <>
              {/* OTP Input */}
              <div className="space-y-3">
                <div className="flex justify-center" dir="ltr">
                  <InputOTP
                    maxLength={6}
                    value={otpValue}
                    onChange={handleOtpChange}
                    disabled={isVerifying}
                    pattern={REGEXP_ONLY_DIGITS}
                    autoFocus
                    aria-label="קוד אימות בן 6 ספרות"
                    containerClassName="gap-2 sm:gap-3 justify-center"
                  >
                    <InputOTPGroup className="gap-1.5">
                      <InputOTPSlot index={0} className={error ? 'border-destructive' : ''} />
                      <InputOTPSlot index={1} className={error ? 'border-destructive' : ''} />
                      <InputOTPSlot index={2} className={error ? 'border-destructive' : ''} />
                    </InputOTPGroup>
                    <InputOTPGroup className="gap-1.5">
                      <InputOTPSlot index={3} className={error ? 'border-destructive' : ''} />
                      <InputOTPSlot index={4} className={error ? 'border-destructive' : ''} />
                      <InputOTPSlot index={5} className={error ? 'border-destructive' : ''} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {error && (
                  <p className="text-center text-sm text-destructive animate-fade-in font-medium" role="alert">{error}</p>
                )}

                {resendSuccess && (
                  <div className="flex items-center justify-center gap-2 text-primary animate-fade-in" role="status">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    <p className="text-sm font-medium">נשלח קוד חדש</p>
                  </div>
                )}
              </div>

              {/* Timer — calm by default, urgent styling only in the last 15s.
                  Framed as "valid for X more" rather than "expires in X". */}
              <div className="text-center" aria-live="off">
                <span className={`text-xs sm:text-sm font-medium ${isUrgent ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`}>
                  {isUrgent ? `פוקע בעוד ${formatTime(countdown)}` : `תקף ל-${formatTime(countdown)} נוספות`}
                </span>
              </div>

              {/* Auto-verify spinner */}
              {isVerifying && (
                <div className="flex items-center justify-center gap-2 py-1 animate-fade-in" role="status">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent" />
                  <span className="text-sm font-medium text-primary">מאמת...</span>
                </div>
              )}

              {/* Resend — inline text link, not a button. Becomes a clickable
                  link once the 30-second cooldown ends. */}
              <div className="text-center text-sm pt-1">
                {isResending ? (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    שולחים קוד חדש...
                  </span>
                ) : canResend ? (
                  <span className="text-muted-foreground">
                    לא קיבלת?{' '}
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="font-semibold text-primary hover:text-primary-glow hover:underline underline-offset-4 transition-colors focus-visible:outline-none focus-visible:underline"
                    >
                      שלחו שוב
                    </button>
                  </span>
                ) : (
                  <span className="text-muted-foreground/70">
                    אפשר לשלוח שוב בעוד {formatTime(resendCountdown)}
                  </span>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Confetti Animation */}
      <ConfettiComponent duration={4000} particleCount={150} />

      {/* Success Celebration Modal */}
      <CelebrationModal
        isOpen={showCelebration}
        title="התחברנו בהצלחה"
        message="מעבירים אותך לדשבורד"
        onClose={handleCelebrationClose}
      />
    </>
  );
};

export default OtpVerification;