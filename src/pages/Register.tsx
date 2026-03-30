import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ModernInput } from '@/components/ui/modern-input';
import { ModernButton } from '@/components/ui/modern-button';
import { InternationalPhoneInput } from '@/components/ui/international-phone-input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SmsVerification from '@/components/auth/SmsVerification';
import PhoneExistsAlert from '@/components/auth/PhoneExistsAlert';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, ShieldCheck, Shield, Clock, RefreshCw } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { REGEXP_ONLY_DIGITS } from 'input-otp';

const registerSchema = z.object({
  name: z.string().min(2, { message: 'שם חייב להיות לפחות 2 תווים' }),
  familyRole: z.enum(['father', 'mother', 'other'], { required_error: 'יש לבחור תפקיד' }),
  email: z.string().email({ message: 'אימייל לא תקין' }),
  phoneNumber: z.string().optional().refine((phone) => {
    if (!phone || phone === '') return true;
    return phone.startsWith('+') && phone.length >= 10 && phone.length <= 15;
  }, { message: 'מספר טלפון חייב להיות בפורמט בינלאומי תקין' }),
  password: z.string().min(6, { message: 'סיסמה חייבת להיות לפחות 6 תווים' }),
  confirmPassword: z.string().min(6, { message: 'סיסמה חייבת להיות לפחות 6 תווים' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "הסיסמאות אינן תואמות",
  path: ["confirmPassword"],
});

const Register = () => {
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [emailFromInvitation, setEmailFromInvitation] = useState<string>('');
  const [invitationId, setInvitationId] = useState<string | null>(null);
  const [showSmsVerification, setShowSmsVerification] = useState(false);
  const [showPhoneExists, setShowPhoneExists] = useState(false);
  const [existingUserName, setExistingUserName] = useState<string | undefined>();
  const [registrationData, setRegistrationData] = useState<z.infer<typeof registerSchema> | null>(null);

  // Email OTP verification state
  const [showEmailOtp, setShowEmailOtp] = useState(false);
  const [emailOtpValue, setEmailOtpValue] = useState('');
  const [isVerifyingEmailOtp, setIsVerifyingEmailOtp] = useState(false);
  const [isResendingEmailOtp, setIsResendingEmailOtp] = useState(false);
  const [emailOtpCountdown, setEmailOtpCountdown] = useState(0);
  const [emailOtpError, setEmailOtpError] = useState('');


  useEffect(() => {
    const urlInvitationId = searchParams.get('invitationId');
    const email = searchParams.get('email');

    if (email) {
      setEmailFromInvitation(email);
    }

    if (urlInvitationId) {
      setInvitationId(urlInvitationId);
    }
  }, [searchParams]);

  // Email OTP countdown timer
  React.useEffect(() => {
    if (emailOtpCountdown > 0) {
      const timer = setTimeout(() => setEmailOtpCountdown(emailOtpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [emailOtpCountdown]);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      familyRole: undefined,
      email: emailFromInvitation || '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Update form when emailFromInvitation changes
  useEffect(() => {
    if (emailFromInvitation) {
      form.setValue('email', emailFromInvitation);
    }
  }, [emailFromInvitation, form]);

  const onSubmit = async (data: z.infer<typeof registerSchema>) => {
    const hasPhone = data.phoneNumber && data.phoneNumber.length >= 10;

    if (hasPhone) {
      // Phone-based flow: send SMS verification
      try {
        const { data: checkData, error: checkError } = await supabase.functions.invoke('send-sms', {
          body: {
            phoneNumber: data.phoneNumber,
            type: 'verification',
            verificationType: 'registration'
          }
        });

        if (checkError) {
          if (checkError.name === 'FunctionsHttpError' && checkError.context) {
            try {
              const errorResponse = checkError.context;
              if (errorResponse && typeof errorResponse.json === 'function') {
                const errorBody = await errorResponse.json();

                if (errorBody?.error === 'PHONE_EXISTS') {
                  setExistingUserName(errorBody.existingUserName);
                  setRegistrationData(data);
                  setShowPhoneExists(true);
                  return;
                }
              }
            } catch (parseError) {
              // Error handled silently
            }
          }

          toast.error('שגיאה בשליחת קוד האימות');
          return;
        }

        if (checkData?.error === 'PHONE_EXISTS') {
          setExistingUserName(checkData.existingUserName);
          setRegistrationData(data);
          setShowPhoneExists(true);
          return;
        }

        setRegistrationData(data);
        setShowSmsVerification(true);
      } catch (error: any) {
        console.error('Registration pre-check error:', error);
        toast.error('שגיאה בתהליך ההרשמה');
      }
    } else {
      // Email-only flow: send email OTP
      try {
        const { error } = await supabase.functions.invoke('send-email-otp', {
          body: { email: data.email, type: 'registration' }
        });

        if (error) {
          toast.error('שגיאה בשליחת קוד האימות לאימייל');
          return;
        }

        setRegistrationData(data);
        setShowEmailOtp(true);
        setEmailOtpCountdown(120);
      } catch (error: any) {
        console.error('Email OTP send error:', error);
        toast.error('שגיאה בתהליך ההרשמה');
      }
    }
  };

  const handleSmsVerificationComplete = async (verified: boolean) => {
    if (!verified || !registrationData) {
      return;
    }

    try {
      localStorage.setItem('pendingPhoneVerification', JSON.stringify({
        phoneNumber: registrationData.phoneNumber,
        verified: true
      }));

      if (invitationId) {
        const pendingInvitations = {
          email: registrationData.email,
          invitations: [{
            invitationId,
            accountId: "",
            accountName: "חשבון משותף",
            ownerId: ""
          }],
          skipOnboarding: true
        };

        localStorage.setItem('pendingInvitationsAfterRegistration', JSON.stringify(pendingInvitations));
      }

      const user = await register(registrationData.name, registrationData.email, registrationData.password, registrationData.phoneNumber);

      if (user?.id && registrationData.familyRole) {
        try {
          await supabase
            .from('profiles')
            .update({ family_role: registrationData.familyRole })
            .eq('id', user.id);
        } catch (roleError) {
          console.error('Error saving family role:', roleError);
        }
      }

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: registrationData.email,
        password: registrationData.password
      });

      if (loginError) {
        console.error('Auto-login failed:', loginError);
        toast.error('הרישום הצליח אך ההתחברות נכשלה - נסה להתחבר ידנית');
        navigate('/login');
        return;
      }

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(`שגיאה ברישום: ${error.message || 'נסה שוב'}`);
    }
  };

  const handleEmailOtpVerified = async (code: string) => {
    if (code.length !== 6 || !registrationData) return;

    setIsVerifyingEmailOtp(true);
    setEmailOtpError('');

    try {
      // Verify the email OTP
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-email-otp', {
        body: { email: registrationData.email, code, type: 'registration' }
      });

      if (verifyError || !verifyData?.verified) {
        setEmailOtpError('קוד שגוי או פג תוקף. נסה שנית.');
        setEmailOtpValue('');
        return;
      }

      // OTP verified - proceed with registration (no phone)
      if (invitationId) {
        const pendingInvitations = {
          email: registrationData.email,
          invitations: [{
            invitationId,
            accountId: "",
            accountName: "חשבון משותף",
            ownerId: ""
          }],
          skipOnboarding: true
        };
        localStorage.setItem('pendingInvitationsAfterRegistration', JSON.stringify(pendingInvitations));
      }

      const user = await register(registrationData.name, registrationData.email, registrationData.password);

      if (user?.id && registrationData.familyRole) {
        try {
          await supabase
            .from('profiles')
            .update({ family_role: registrationData.familyRole })
            .eq('id', user.id);
        } catch (roleError) {
          console.error('Error saving family role:', roleError);
        }
      }

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: registrationData.email,
        password: registrationData.password
      });

      if (loginError) {
        console.error('Auto-login failed:', loginError);
        toast.error('הרישום הצליח אך ההתחברות נכשלה - נסה להתחבר ידנית');
        navigate('/login');
        return;
      }

      toast.success('הרישום הושלם בהצלחה!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(`שגיאה ברישום: ${error.message || 'נסה שוב'}`);
    } finally {
      setIsVerifyingEmailOtp(false);
    }
  };

  const handleEmailOtpChange = (value: string) => {
    setEmailOtpError('');
    setEmailOtpValue(value);
    if (value.length === 6) {
      handleEmailOtpVerified(value);
    }
  };

  const handleResendEmailOtp = async () => {
    if (!registrationData) return;
    setIsResendingEmailOtp(true);
    setEmailOtpError('');
    try {
      await supabase.functions.invoke('send-email-otp', {
        body: { email: registrationData.email, type: 'registration' }
      });
      setEmailOtpCountdown(120);
      setEmailOtpValue('');
      toast.success('קוד אימות חדש נשלח!');
    } catch (error) {
      console.error('Failed to resend email OTP:', error);
      setEmailOtpError('שגיאה בשליחת קוד חדש');
    } finally {
      setIsResendingEmailOtp(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBackToForm = () => {
    setShowSmsVerification(false);
    setShowPhoneExists(false);
    setShowEmailOtp(false);
    setRegistrationData(null);
    setExistingUserName(undefined);
    setEmailOtpValue('');
    setEmailOtpError('');
  };

  // Show phone exists alert
  if (showPhoneExists && registrationData) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-primary/20 to-primary-glow/20 rounded-full blur-[100px] animate-float" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-r from-secondary/15 to-primary/15 rounded-full blur-[80px] animate-pulse-slow" />
        </div>
        <div className="container mx-auto py-6 sm:py-10 px-4 flex items-center justify-center min-h-screen">
          <div className="w-full max-w-md" dir="rtl">
            <PhoneExistsAlert
              phoneNumber={registrationData.phoneNumber || ''}
              userName={existingUserName}
              onBack={handleBackToForm}
            />
          </div>
        </div>
      </div>
    );
  }

  // Show SMS verification
  if (showSmsVerification && registrationData) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-primary/20 to-primary-glow/20 rounded-full blur-[100px] animate-float" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-r from-secondary/15 to-primary/15 rounded-full blur-[80px] animate-pulse-slow" />
        </div>
        <div className="container mx-auto py-6 sm:py-10 px-4 flex items-center justify-center min-h-screen">
          <div className="w-full max-w-md" dir="rtl">
            <SmsVerification
              phoneNumber={registrationData.phoneNumber || ''}
              onVerificationComplete={handleSmsVerificationComplete}
              onBack={handleBackToForm}
              skipInitialSend={true}
            />
          </div>
        </div>
      </div>
    );
  }

  // Show Email OTP verification
  if (showEmailOtp && registrationData) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-primary/20 to-primary-glow/20 rounded-full blur-[100px] animate-float" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-r from-secondary/15 to-primary/15 rounded-full blur-[80px] animate-pulse-slow" />
        </div>
        <div className="container mx-auto py-6 sm:py-10 px-4 flex items-center justify-center min-h-screen">
          <div className="w-full max-w-md" dir="rtl">
            <Card className="border-border shadow-lg animate-fade-in glass overflow-hidden">
              <div className="h-1 w-full bg-muted/30">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-1000 ease-linear"
                  style={{ width: `${(emailOtpCountdown / 120) * 100}%` }}
                />
              </div>
              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Shield className="w-6 h-6 text-green-500" />
                  <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                    אימות כתובת אימייל
                  </CardTitle>
                </div>
                <CardDescription className="text-sm sm:text-base">
                  <span>נשלח קוד אימות לכתובת</span>
                  <br />
                  <span className="font-mono text-base sm:text-lg font-semibold text-foreground tracking-wider" dir="ltr">
                    {registrationData.email}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 px-4 sm:px-6">
                <div className="space-y-3">
                  <div className="flex justify-center" dir="ltr">
                    <InputOTP
                      maxLength={6}
                      value={emailOtpValue}
                      onChange={handleEmailOtpChange}
                      disabled={isVerifyingEmailOtp || emailOtpCountdown === 0}
                      pattern={REGEXP_ONLY_DIGITS}
                      autoFocus
                      containerClassName="gap-1 sm:gap-2 justify-center"
                    >
                      <InputOTPGroup className="gap-1 sm:gap-1.5">
                        <InputOTPSlot index={0} className={emailOtpError ? 'border-destructive' : ''} />
                        <InputOTPSlot index={1} className={emailOtpError ? 'border-destructive' : ''} />
                        <InputOTPSlot index={2} className={emailOtpError ? 'border-destructive' : ''} />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup className="gap-1 sm:gap-1.5">
                        <InputOTPSlot index={3} className={emailOtpError ? 'border-destructive' : ''} />
                        <InputOTPSlot index={4} className={emailOtpError ? 'border-destructive' : ''} />
                        <InputOTPSlot index={5} className={emailOtpError ? 'border-destructive' : ''} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  {emailOtpError && (
                    <p className="text-center text-sm text-destructive animate-fade-in font-medium">{emailOtpError}</p>
                  )}
                </div>

                <div className="flex items-center justify-center gap-2">
                  <Clock className={`w-4 h-4 ${emailOtpCountdown <= 30 ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${emailOtpCountdown <= 30 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {emailOtpCountdown > 0 ? `הקוד יפוג בעוד ${formatTime(emailOtpCountdown)}` : 'הקוד פג תוקף'}
                  </span>
                </div>

                {isVerifyingEmailOtp && (
                  <div className="flex items-center justify-center gap-2 py-2 animate-fade-in">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-r-transparent" />
                    <span className="text-sm font-medium text-primary">מאמת ומשלים רישום...</span>
                  </div>
                )}

                <div className="space-y-3 pt-1">
                  <Button
                    onClick={() => handleEmailOtpVerified(emailOtpValue)}
                    disabled={isVerifyingEmailOtp || emailOtpValue.length !== 6 || emailOtpCountdown === 0}
                    className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold py-3 h-12 sm:h-14 text-base sm:text-lg shadow-lg transform transition-all duration-200 hover:scale-[1.02] disabled:transform-none rounded-xl"
                  >
                    {isVerifyingEmailOtp ? (
                      <span className="flex items-center gap-2">
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
                        מאמת ומשלים רישום...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        אמת והירשם
                      </span>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleResendEmailOtp}
                    disabled={isResendingEmailOtp || emailOtpCountdown > 60}
                    className="w-full h-11 sm:h-12 rounded-xl text-sm sm:text-base"
                  >
                    {isResendingEmailOtp ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        שולח שוב...
                      </span>
                    ) : emailOtpCountdown > 60 ? (
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {`שלח שוב בעוד ${formatTime(emailOtpCountdown - 60)}`}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" />
                        שלח קוד שוב
                      </span>
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={handleBackToForm}
                    className="w-full flex items-center gap-2 hover:bg-muted/50 transition-colors h-10 sm:h-11 text-sm sm:text-base"
                  >
                    <ArrowRight className="w-4 h-4" />
                    חזור לעריכת פרטים
                  </Button>
                </div>

                <div className="text-center text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl space-y-1">
                  <p>בדוק את תיבת הדואר הנכנס שלך (כולל ספאם)</p>
                  <p>הקוד מוזן אוטומטית עם ההקלדה</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Enhanced Animated Background - identical to Login */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-primary/20 to-primary-glow/20 rounded-full blur-[100px] animate-float" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-r from-secondary/15 to-primary/15 rounded-full blur-[80px] animate-pulse-slow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/5 to-transparent rounded-full" />

        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />

        <div className="absolute top-20 right-20 w-2 h-2 bg-primary/30 rounded-full animate-float" style={{ animationDelay: '0s' }} />
        <div className="absolute top-40 left-32 w-1.5 h-1.5 bg-primary-glow/40 rounded-full animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-32 right-40 w-3 h-3 bg-secondary/20 rounded-full animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-20 left-20 w-1.5 h-1.5 bg-primary/30 rounded-full animate-pulse-slow" style={{ animationDelay: '0.5s' }} />
      </div>

      <div className="container mx-auto py-6 sm:py-10 px-4 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md" dir="rtl">
          {/* Main Registration Card - identical style to Login */}
          <Card className="relative border-0 shadow-2xl bg-card/85 backdrop-blur-xl overflow-hidden animate-scale-in">
            {/* Decorative top gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-primary-glow to-secondary" />

            {/* Glowing border effect */}
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/10 via-transparent to-primary-glow/10 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <CardHeader className="text-center pt-8 pb-2 px-6 sm:px-8">
              {/* Compact wallet mascots with glow - identical to Login */}
              <div className="flex justify-center gap-3 mb-4">
                <div className="relative group">
                  <div className="absolute inset-0 bg-primary/15 rounded-full blur-lg group-hover:blur-xl transition-all duration-300" />
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white overflow-hidden flex items-center justify-center animate-float hover:scale-110 transition-transform duration-300">
                    <img
                      src="/lovable-uploads/3a973532-2477-462a-9a84-0390b7045844.webp"
                      alt="Red Wallet Character"
                      className="w-full h-full object-contain mix-blend-multiply"
                      loading="lazy"
                    />
                  </div>
                </div>
                <div className="relative group">
                  <div className="absolute inset-0 bg-secondary/15 rounded-full blur-lg group-hover:blur-xl transition-all duration-300" />
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white overflow-hidden flex items-center justify-center animate-float [animation-delay:1s] hover:scale-110 transition-transform duration-300">
                    <img
                      src="/lovable-uploads/3d7094a5-211e-416b-a8c4-8fd864c98499.webp"
                      alt="Green Wallet Character"
                      className="w-full h-full object-contain mix-blend-multiply"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>

              {/* Title */}
              <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary via-primary-glow to-secondary bg-clip-text text-transparent mb-2">
                יצירת חשבון חדש
              </CardTitle>
              <CardDescription className="text-sm sm:text-base text-muted-foreground">
                הירשם כדי להתחיל לנהל את ההוצאות המשפחתיות
                {emailFromInvitation && (
                  <div className="mt-3 p-2.5 bg-primary/5 rounded-xl border border-primary/20">
                    <div className="text-xs sm:text-sm text-primary font-medium">
                      הוזמנת דרך: {emailFromInvitation}
                    </div>
                    {invitationId && (
                      <div className="mt-1 text-[10px] sm:text-xs text-green-600 dark:text-green-400">
                        חיבור אוטומטי אחרי אימות
                      </div>
                    )}
                  </div>
                )}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 px-6 sm:px-8 pb-6 pt-4">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <ModernInput
                  label="שם מלא"
                  icon="user"
                  placeholder="ישראל ישראלי"
                  value={form.watch('name')}
                  onChange={(e) => form.setValue('name', e.target.value)}
                  validation={form.formState.errors.name ? 'invalid' : form.watch('name') && form.watch('name').length >= 2 ? 'valid' : 'none'}
                  validationMessage={form.formState.errors.name?.message}
                />

                {/* Family role selector */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">אני...</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: 'father' as const, label: 'אבא', image: '/avatars/roles/father.webp' },
                      { value: 'mother' as const, label: 'אמא', image: '/avatars/roles/mother.webp' },
                      { value: 'other' as const, label: 'אחר', emoji: '\u{1F464}' },
                    ] as const).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => form.setValue('familyRole', option.value)}
                        className={`flex flex-col items-center gap-1.5 p-2.5 sm:p-3 rounded-xl border-2 transition-all duration-200 text-sm font-medium ${
                          form.watch('familyRole') === option.value
                            ? 'border-primary bg-primary/10 text-primary shadow-sm'
                            : 'border-border/50 bg-background/50 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground'
                        }`}
                      >
                        {'image' in option && option.image ? (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center overflow-hidden p-0.5">
                            <img src={option.image} alt={option.label} className="w-full h-full object-contain" loading="lazy" />
                          </div>
                        ) : (
                          <span className="text-xl sm:text-2xl">{'emoji' in option ? option.emoji : '\u{1F464}'}</span>
                        )}
                        <span className="text-xs sm:text-sm">{option.label}</span>
                      </button>
                    ))}
                  </div>
                  {form.formState.errors.familyRole && (
                    <p className="text-xs text-destructive">{form.formState.errors.familyRole.message}</p>
                  )}
                </div>

                <ModernInput
                  label="כתובת אימייל"
                  icon="email"
                  type="email"
                  placeholder="your@email.com"
                  value={form.watch('email')}
                  onChange={(e) => form.setValue('email', e.target.value)}
                  disabled={!!emailFromInvitation}
                  validation={form.formState.errors.email ? 'invalid' : form.watch('email') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.watch('email')) ? 'valid' : 'none'}
                  validationMessage={form.formState.errors.email?.message}
                />

                <InternationalPhoneInput
                  label="מספר טלפון (אופציונלי)"
                  value={form.watch('phoneNumber') || ''}
                  onChange={(value) => form.setValue('phoneNumber', value)}
                  validation={form.formState.errors.phoneNumber ? 'invalid' : form.watch('phoneNumber') && form.watch('phoneNumber')!.startsWith('+') && form.watch('phoneNumber')!.length >= 10 ? 'valid' : 'none'}
                  validationMessage={form.formState.errors.phoneNumber?.message}
                />

                <ModernInput
                  label="סיסמה"
                  icon="password"
                  type="password"
                  placeholder="******"
                  value={form.watch('password')}
                  onChange={(e) => form.setValue('password', e.target.value)}
                  validation={form.formState.errors.password ? 'invalid' : form.watch('password') && form.watch('password').length >= 6 ? 'valid' : 'none'}
                  validationMessage={form.formState.errors.password?.message}
                />

                <ModernInput
                  label="אימות סיסמה"
                  icon="password"
                  type="password"
                  placeholder="******"
                  value={form.watch('confirmPassword')}
                  onChange={(e) => form.setValue('confirmPassword', e.target.value)}
                  validation={form.formState.errors.confirmPassword ? 'invalid' : form.watch('confirmPassword') && form.watch('password') === form.watch('confirmPassword') ? 'valid' : 'none'}
                  validationMessage={form.formState.errors.confirmPassword?.message}
                />

                <ModernButton
                  type="submit"
                  className="w-full h-12 text-base font-semibold rounded-xl shadow-lg hover:shadow-glow transition-all duration-300 mt-2"
                  size="lg"
                  loading={isLoading}
                  variant="primary"
                >
                  {isLoading ? 'ממשיך לאימות...' : (form.watch('phoneNumber') && form.watch('phoneNumber')!.length >= 10 ? 'המשך לאימות SMS' : 'המשך לאימות אימייל')}
                </ModernButton>
              </form>
            </CardContent>

            {/* Footer with login link */}
            <CardFooter className="flex flex-col items-center gap-4 pb-8 px-6 sm:px-8 border-t border-border/40 pt-6">
              <p className="text-sm sm:text-base text-muted-foreground">
                כבר יש לך חשבון?{' '}
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-primary hover:text-primary-glow transition-colors duration-200 font-semibold hover:underline underline-offset-4"
                >
                  התחבר כאן
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </p>

              {/* Trust indicator */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>הנתונים שלך מאובטחים ומוצפנים</span>
              </div>
            </CardFooter>
          </Card>

          {/* Bottom decorative text */}
          <p className="text-center text-xs text-muted-foreground/50 mt-5 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            ניהול הוצאות משפחתי חכם ופשוט
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
