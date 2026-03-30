
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Mail, Shield, Clock, RefreshCw, ArrowRight, Lock, CheckCircle, Loader2 } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'אימייל לא תקין' }),
});

type Step = 'email' | 'otp' | 'newPassword';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');

  // OTP state
  const [otpValue, setOtpValue] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpError, setOtpError] = useState('');

  // New password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  // OTP countdown timer
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Step 1: Send OTP to email
  const onSubmitEmail = async (data: z.infer<typeof forgotPasswordSchema>) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-email-otp', {
        body: { email: data.email, type: 'reset' }
      });

      if (error) {
        toast.error('שגיאה בשליחת קוד האימות');
        return;
      }

      setEmail(data.email);
      setStep('otp');
      setOtpCountdown(120);
      toast.success('קוד אימות נשלח לאימייל שלך');
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('שגיאה בשליחת קוד האימות');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (code: string) => {
    if (code.length !== 6) return;

    setIsVerifyingOtp(true);
    setOtpError('');

    try {
      const { data, error } = await supabase.functions.invoke('verify-email-otp', {
        body: { email, code, type: 'reset' }
      });

      if (error || !data?.verified) {
        setOtpError('קוד שגוי או פג תוקף. נסה שנית.');
        setOtpValue('');
        return;
      }

      // If we received session tokens, set the session
      if (data.access_token && data.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token
        });
      }

      setStep('newPassword');
    } catch (error) {
      console.error('OTP verification failed:', error);
      setOtpError('שגיאה באימות הקוד');
      setOtpValue('');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleOtpChange = (value: string) => {
    setOtpError('');
    setOtpValue(value);
    if (value.length === 6) {
      handleVerifyOtp(value);
    }
  };

  const handleResendOtp = async () => {
    setIsResendingOtp(true);
    setOtpError('');
    try {
      await supabase.functions.invoke('send-email-otp', {
        body: { email, type: 'reset' }
      });
      setOtpCountdown(120);
      setOtpValue('');
      toast.success('קוד אימות חדש נשלח!');
    } catch (error) {
      console.error('Failed to resend OTP:', error);
      setOtpError('שגיאה בשליחת קוד חדש');
    } finally {
      setIsResendingOtp(false);
    }
  };

  // Step 3: Set new password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!newPassword) {
      setPasswordError('אנא הזן סיסמה חדשה');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('הסיסמאות אינן תואמות');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        console.error('Password update error:', error);
        setPasswordError('שגיאה בעדכון הסיסמה. אנא נסה שוב.');
        return;
      }

      await supabase.auth.signOut();
      toast.success('הסיסמה עודכנה בהצלחה! אנא התחבר עם הסיסמה החדשה');
      setTimeout(() => navigate('/login?message=password-updated'), 2000);
    } catch (err) {
      console.error('Error updating password:', err);
      setPasswordError('שגיאה לא צפויה. אנא נסה שוב.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Step 1: Email input
  if (step === 'email') {
    return (
      <div className="container mx-auto py-6 sm:py-10 px-3 sm:px-4 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="w-full max-w-md" dir="rtl">
          <Card className="border-border shadow-lg animate-fade-in">
            <CardHeader className="text-center px-4 sm:px-6">
              <CardTitle className="text-xl sm:text-2xl font-bold">שחזור סיסמה</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                הזן את כתובת האימייל שלך ואנו נשלח לך קוד אימות
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitEmail)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>אימייל</FormLabel>
                        <FormControl>
                          <Input placeholder="your@email.com" {...field} dir="ltr" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                        שולח...
                      </span>
                    ) : (
                      'שלח קוד אימות'
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex justify-center">
              <p className="text-sm text-muted-foreground">
                <Link to="/login" className="text-brand-600 hover:underline">
                  חזרה למסך התחברות
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // Step 2: OTP verification
  if (step === 'otp') {
    return (
      <div className="container mx-auto py-6 sm:py-10 px-3 sm:px-4 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="w-full max-w-md" dir="rtl">
          <Card className="border-border shadow-lg animate-fade-in glass overflow-hidden">
            <div className="h-1 w-full bg-muted/30">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-1000 ease-linear"
                style={{ width: `${(otpCountdown / 120) * 100}%` }}
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
                <span>נשלח קוד אימות לכתובת</span>
                <br />
                <span className="font-mono text-base sm:text-lg font-semibold text-foreground tracking-wider" dir="ltr">
                  {email}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 px-4 sm:px-6">
              <div className="space-y-3">
                <div className="flex justify-center" dir="ltr">
                  <InputOTP
                    maxLength={6}
                    value={otpValue}
                    onChange={handleOtpChange}
                    disabled={isVerifyingOtp || otpCountdown === 0}
                    pattern={REGEXP_ONLY_DIGITS}
                    autoFocus
                    containerClassName="gap-1 sm:gap-2 justify-center"
                  >
                    <InputOTPGroup className="gap-1 sm:gap-1.5">
                      <InputOTPSlot index={0} className={otpError ? 'border-destructive' : ''} />
                      <InputOTPSlot index={1} className={otpError ? 'border-destructive' : ''} />
                      <InputOTPSlot index={2} className={otpError ? 'border-destructive' : ''} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup className="gap-1 sm:gap-1.5">
                      <InputOTPSlot index={3} className={otpError ? 'border-destructive' : ''} />
                      <InputOTPSlot index={4} className={otpError ? 'border-destructive' : ''} />
                      <InputOTPSlot index={5} className={otpError ? 'border-destructive' : ''} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {otpError && (
                  <p className="text-center text-sm text-destructive animate-fade-in font-medium">{otpError}</p>
                )}
              </div>

              <div className="flex items-center justify-center gap-2">
                <Clock className={`w-4 h-4 ${otpCountdown <= 30 ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-medium ${otpCountdown <= 30 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {otpCountdown > 0 ? `הקוד יפוג בעוד ${formatTime(otpCountdown)}` : 'הקוד פג תוקף'}
                </span>
              </div>

              {isVerifyingOtp && (
                <div className="flex items-center justify-center gap-2 py-2 animate-fade-in">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-r-transparent" />
                  <span className="text-sm font-medium text-primary">מאמת את הקוד...</span>
                </div>
              )}

              <div className="space-y-3 pt-1">
                <Button
                  onClick={() => handleVerifyOtp(otpValue)}
                  disabled={isVerifyingOtp || otpValue.length !== 6 || otpCountdown === 0}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold py-3 h-12 sm:h-14 text-base sm:text-lg shadow-lg transform transition-all duration-200 hover:scale-[1.02] disabled:transform-none rounded-xl"
                >
                  {isVerifyingOtp ? (
                    <span className="flex items-center gap-2">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
                      מאמת...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      אמת קוד
                    </span>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleResendOtp}
                  disabled={isResendingOtp || otpCountdown > 60}
                  className="w-full h-11 sm:h-12 rounded-xl text-sm sm:text-base"
                >
                  {isResendingOtp ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      שולח שוב...
                    </span>
                  ) : otpCountdown > 60 ? (
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {`שלח שוב בעוד ${formatTime(otpCountdown - 60)}`}
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
                    setStep('email');
                    setOtpValue('');
                    setOtpError('');
                  }}
                  className="w-full flex items-center gap-2 hover:bg-muted/50 transition-colors h-10 sm:h-11 text-sm sm:text-base"
                >
                  <ArrowRight className="w-4 h-4" />
                  חזור להזנת אימייל
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
    );
  }

  // Step 3: Set new password
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-3 sm:px-4">
      <div className="w-full max-w-md" dir="rtl">
        <Card className="border-border shadow-lg animate-fade-in">
          <CardHeader className="text-center px-4 sm:px-6">
            <div className="flex justify-center mb-3 sm:mb-4">
              <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-green-500" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold">עדכון סיסמה</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              הזן סיסמה חדשה לחשבון שלך
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {passwordError && (
                <Alert variant="destructive">
                  <AlertDescription>{passwordError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">סיסמה חדשה</Label>
                <Input
                  id="password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="הזן סיסמה חדשה"
                  required
                  disabled={isUpdatingPassword}
                  minLength={6}
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">אישור סיסמה</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="הזן שוב את הסיסמה החדשה"
                  required
                  disabled={isUpdatingPassword}
                  minLength={6}
                  dir="ltr"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isUpdatingPassword}
              >
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    מעדכן סיסמה...
                  </>
                ) : (
                  'עדכן סיסמה'
                )}
              </Button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  חזור לדף התחברות
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
