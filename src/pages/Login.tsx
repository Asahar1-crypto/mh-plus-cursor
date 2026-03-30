
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ModernButton } from '@/components/ui/modern-button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowLeft, ArrowRight, ShieldCheck, Shield, Clock, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import AuthMethodToggle from '@/components/auth/AuthMethodToggle';
import PhoneLogin from '@/components/auth/PhoneLogin';
import { supabase } from '@/integrations/supabase/client';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { REGEXP_ONLY_DIGITS } from 'input-otp';

const loginSchema = z.object({
  email: z.string().email({ message: 'אימייל לא תקין' }),
  password: z.string().min(6, { message: 'סיסמה חייבת להיות לפחות 6 תווים' }),
});

const Login = () => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>(() => {
    const phoneLoginInProgress = sessionStorage.getItem('phoneLoginInProgress');
    if (phoneLoginInProgress) {
      sessionStorage.removeItem('phoneLoginInProgress');
      sessionStorage.removeItem('phoneLogin_showOtp');
      sessionStorage.removeItem('phoneLogin_userInfo');
      sessionStorage.removeItem('phoneLogin_phoneNumber');
      sessionStorage.removeItem('login_authMethod');
      setTimeout(() => {
        navigate('/dashboard');
      }, 100);
      return 'email';
    }

    return (sessionStorage.getItem('login_authMethod') as 'email' | 'phone') || 'phone';
  });

  // Email verification OTP state
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [emailOtpValue, setEmailOtpValue] = useState('');
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isResendingEmailOtp, setIsResendingEmailOtp] = useState(false);
  const [emailOtpCountdown, setEmailOtpCountdown] = useState(0);
  const [emailOtpError, setEmailOtpError] = useState('');

  // Email OTP countdown timer
  React.useEffect(() => {
    if (emailOtpCountdown > 0) {
      const timer = setTimeout(() => setEmailOtpCountdown(emailOtpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [emailOtpCountdown]);

  const handleAuthMethodChange = (method: 'email' | 'phone') => {
    sessionStorage.setItem('login_authMethod', method);
    setAuthMethod(method);
  };

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    try {
      await login(data.email, data.password);

      // Check if email is verified
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email_verified')
          .eq('id', session.user.id)
          .single();

        if (profile && !profile.email_verified) {
          // Send OTP to email
          await supabase.functions.invoke('send-email-otp', {
            body: { email: data.email, type: 'email_verification' }
          });
          setShowEmailVerification(true);
          setPendingEmail(data.email);
          setEmailOtpCountdown(120);
          return;
        }
      }

      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('שם משתמש או סיסמה שגויים');
    }
  };

  const handleVerifyEmailOtp = async (code: string) => {
    if (code.length !== 6) return;

    setIsVerifyingEmail(true);
    setEmailOtpError('');

    try {
      const { data, error } = await supabase.functions.invoke('verify-email-otp', {
        body: { email: pendingEmail, code, type: 'email_verification' }
      });

      if (error || !data?.verified) {
        setEmailOtpError('קוד שגוי או פג תוקף. נסה שנית.');
        setEmailOtpValue('');
        return;
      }

      toast.success('האימייל אומת בהצלחה!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Email OTP verification failed:', error);
      setEmailOtpError('שגיאה באימות הקוד');
      setEmailOtpValue('');
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const handleResendEmailOtp = async () => {
    setIsResendingEmailOtp(true);
    setEmailOtpError('');
    try {
      await supabase.functions.invoke('send-email-otp', {
        body: { email: pendingEmail, type: 'email_verification' }
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

  const handleEmailOtpChange = (value: string) => {
    setEmailOtpError('');
    setEmailOtpValue(value);
    if (value.length === 6) {
      handleVerifyEmailOtp(value);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBackToEmailLogin = () => {
    sessionStorage.setItem('login_authMethod', 'email');
    sessionStorage.removeItem('phoneLogin_showOtp');
    sessionStorage.removeItem('phoneLogin_userInfo');
    sessionStorage.removeItem('phoneLogin_phoneNumber');
    sessionStorage.removeItem('phoneLoginInProgress');
    setAuthMethod('email');
  };

  // Email verification OTP screen
  if (showEmailVerification) {
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
                    {pendingEmail}
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
                      disabled={isVerifyingEmail || emailOtpCountdown === 0}
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

                {isVerifyingEmail && (
                  <div className="flex items-center justify-center gap-2 py-2 animate-fade-in">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-r-transparent" />
                    <span className="text-sm font-medium text-primary">מאמת את הקוד...</span>
                  </div>
                )}

                <div className="space-y-3 pt-1">
                  <Button
                    onClick={() => handleVerifyEmailOtp(emailOtpValue)}
                    disabled={isVerifyingEmail || emailOtpValue.length !== 6 || emailOtpCountdown === 0}
                    className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold py-3 h-12 sm:h-14 text-base sm:text-lg shadow-lg transform transition-all duration-200 hover:scale-[1.02] disabled:transform-none rounded-xl"
                  >
                    {isVerifyingEmail ? (
                      <span className="flex items-center gap-2">
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
                        מאמת...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        אמת אימייל
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
                    onClick={() => {
                      setShowEmailVerification(false);
                      setEmailOtpValue('');
                      setEmailOtpError('');
                    }}
                    className="w-full flex items-center gap-2 hover:bg-muted/50 transition-colors h-10 sm:h-11 text-sm sm:text-base"
                  >
                    <ArrowRight className="w-4 h-4" />
                    חזור להתחברות
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
      {/* Enhanced Animated Background */}
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
          {/* Main Login Card */}
          <Card className="relative border-0 shadow-2xl bg-card/85 backdrop-blur-xl overflow-hidden animate-scale-in">
            {/* Decorative top gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-primary-glow to-secondary" />

            {/* Glowing border effect */}
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/10 via-transparent to-primary-glow/10 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <CardHeader className="text-center pt-8 pb-2 px-6 sm:px-8">
              {/* Compact wallet mascots with glow */}
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
                ברוכים הבאים
              </CardTitle>
              <CardDescription className="text-sm sm:text-base text-muted-foreground">
                התחבר כדי לנהל את ההוצאות המשפחתיות שלך
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 px-6 sm:px-8 pb-6 pt-4">
              {/* Auth Method Toggle */}
              <AuthMethodToggle
                method={authMethod}
                onChange={handleAuthMethodChange}
                disabled={isLoading}
              />

              {/* Separator */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/60" />
                </div>
              </div>

              {/* Dynamic Content Based on Auth Method */}
              {authMethod === 'email' ? (
                <div className="space-y-4 animate-fade-in">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-sm font-medium text-foreground">כתובת אימייל</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none z-10">
                                  <Mail className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                                </div>
                                <Input
                                  placeholder="your@email.com"
                                  {...field}
                                  className="pl-10 h-12 text-base bg-background/80 border border-border/80 shadow-sm rounded-xl transition-all duration-300 focus:bg-background focus:shadow-glow focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-primary/40 placeholder:text-muted-foreground/50"
                                  dir="ltr"
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <FormLabel className="text-sm font-medium text-foreground">סיסמה</FormLabel>
                              <Link
                                to="/forgot-password"
                                className="text-xs text-primary/80 hover:text-primary transition-colors duration-200 hover:underline underline-offset-4"
                              >
                                שכחת סיסמה?
                              </Link>
                            </div>
                            <FormControl>
                              <div className="relative group">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none z-10">
                                  <Lock className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                                </div>
                                <Input
                                  type="password"
                                  placeholder="••••••••"
                                  {...field}
                                  className="pl-10 h-12 text-base bg-background/80 border border-border/80 shadow-sm rounded-xl transition-all duration-300 focus:bg-background focus:shadow-glow focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-primary/40 placeholder:text-muted-foreground/50"
                                  dir="ltr"
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <ModernButton
                        type="submit"
                        className="w-full h-12 text-base font-semibold rounded-xl shadow-lg hover:shadow-glow transition-all duration-300 mt-2"
                        size="lg"
                        loading={isLoading}
                        variant="primary"
                      >
                        {isLoading ? 'מתחבר...' : 'התחבר לחשבון'}
                      </ModernButton>
                    </form>
                  </Form>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  <PhoneLogin onBack={handleBackToEmailLogin} hideHeader={true} />
                </div>
              )}
            </CardContent>

            {/* Footer with register link */}
            <CardFooter className="flex flex-col items-center gap-4 pb-8 px-6 sm:px-8 border-t border-border/40 pt-6">
              <p className="text-sm sm:text-base text-muted-foreground">
                עדיין אין לך חשבון?{' '}
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1 text-primary hover:text-primary-glow transition-colors duration-200 font-semibold hover:underline underline-offset-4"
                >
                  הירשם כאן
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </p>

              {/* Trust indicator */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>החיבור מאובטח ומוצפן</span>
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

export default Login;
