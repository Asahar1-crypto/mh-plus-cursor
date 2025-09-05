import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Users, Clock, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const FamilyOtp = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const invitationId = searchParams.get('invitationId');
  const phone = decodeURIComponent(searchParams.get('phone') || '');
  const name = decodeURIComponent(searchParams.get('name') || '');
  const email = decodeURIComponent(searchParams.get('email') || '');
  
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  // Auto-verify when OTP is complete
  useEffect(() => {
    if (otp.length === 6) {
      handleVerifyOtp();
    }
  }, [otp]);

  // Send initial SMS on mount
  useEffect(() => {
    if (phone) {
      sendSms();
    }
  }, [phone]);

  const sendSms = async () => {
    try {
      console.log('Sending SMS to:', phone);
      
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          phone_number: phone,
          verification_type: 'family_registration'
        }
      });

      if (error) {
        console.error('SMS sending error:', error);
        toast.error('שגיאה בשליחת SMS: ' + error.message);
      } else {
        console.log('SMS sent successfully:', data);
        toast.success('קוד אימות נשלח ל-' + phone);
      }
    } catch (error: any) {
      console.error('SMS error:', error);
      toast.error('שגיאה בשליחת SMS');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('יש להזין קוד בן 6 ספרות');
      return;
    }

    setIsVerifying(true);
    try {
      console.log('Verifying OTP:', otp, 'for phone:', phone);
      
      const { data, error } = await supabase.functions.invoke('verify-sms-code', {
        body: {
          phone_number: phone,
          code: otp,
          verification_type: 'family_registration'
        }
      });

      if (error) {
        console.error('OTP verification error:', error);
        toast.error('קוד שגוי או פג תוקף');
        setOtp('');
        return;
      }

      if (data?.verified) {
        console.log('OTP verified successfully');
        toast.success('הטלפון אומת בהצלחה!');
        
        // Now proceed with user registration and auto-join family
        await completeRegistration();
      } else {
        toast.error('קוד שגוי או פג תוקף');
        setOtp('');
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);
      toast.error('שגיאה באימות הקוד');
      setOtp('');
    } finally {
      setIsVerifying(false);
    }
  };

  const completeRegistration = async () => {
    try {
      console.log('Completing family registration with data:', {
        name, email, phone, invitationId
      });

      // TODO: Implement complete family registration
      // This should:
      // 1. Create user account with Supabase Auth
      // 2. Create user profile
      // 3. Accept the invitation and join the family account
      // 4. Automatically log the user in
      
      toast.success('הרישום הושלם בהצלחה! מתחבר...');
      
      // For now, navigate to success page (to be implemented)
      navigate(`/family-success?invitationId=${invitationId}`);
      
    } catch (error: any) {
      console.error('Registration completion error:', error);
      toast.error('שגיאה בהשלמת הרישום: ' + error.message);
    }
  };

  const handleResendSms = async () => {
    if (!canResend) return;
    
    setIsResending(true);
    setCanResend(false);
    setCountdown(60);
    
    await sendSms();
    setIsResending(false);
  };

  if (!invitationId || !phone || !name || !email) {
    return (
      <div className="container mx-auto py-10 px-4 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]" dir="rtl">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-destructive">נתונים חסרים לאימות</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate('/')}
              >
                חזרה לעמוד הבית
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">אימות מספר טלפון</CardTitle>
          <CardDescription>
            הזן את הקוד שנשלח ל-{phone}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* User Info */}
          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{name}</span>
            </div>
            <div className="text-sm text-muted-foreground">{email}</div>
          </div>

          {/* OTP Input */}
          <div className="space-y-4">
            <div className="flex justify-center">
              <InputOTP 
                value={otp} 
                onChange={setOtp} 
                maxLength={6}
                disabled={isVerifying}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            
            <p className="text-center text-sm text-muted-foreground">
              הזן את הקוד בן 6 הספרות שנשלח אליך
            </p>
          </div>

          {/* Verify Button */}
          <Button 
            onClick={handleVerifyOtp}
            className="w-full" 
            size="lg"
            disabled={isVerifying || otp.length !== 6}
          >
            {isVerifying ? 'מאמת...' : 'אמת והצטרף למשפחה'}
          </Button>

          {/* Resend SMS */}
          <div className="text-center space-y-2">
            {!canResend ? (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>אפשר לשלוח שוב בעוד {countdown} שניות</span>
              </div>
            ) : (
              <Button
                variant="ghost"
                onClick={handleResendSms}
                disabled={isResending}
                className="text-sm"
              >
                {isResending ? 'שולח...' : 'שלח קוד חדש'}
              </Button>
            )}
          </div>

          {/* Back option */}
          <div className="text-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="w-full"
            >
              חזרה לדף הרישום
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FamilyOtp;