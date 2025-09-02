import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SmsVerificationProps {
  phoneNumber: string;
  onVerificationComplete: (verified: boolean) => void;
  onBack: () => void;
}

const SmsVerification: React.FC<SmsVerificationProps> = ({
  phoneNumber,
  onVerificationComplete,
  onBack
}) => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    // Start countdown for resend button
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const sendVerificationCode = async () => {
    setIsResending(true);
    try {
      const { error } = await supabase.functions.invoke('send-sms', {
        body: {
          phoneNumber,
          type: 'verification'
        }
      });

      if (error) {
        console.error('Error sending SMS:', error);
        toast.error('שגיאה בשליחת קוד האימות');
      } else {
        toast.success('קוד האימות נשלח בהצלחה');
        setCountdown(60); // Start 60 second countdown
      }
    } catch (error) {
      console.error('Error sending verification code:', error);
      toast.error('שגיאה בשליחת קוד האימות');
    } finally {
      setIsResending(false);
    }
  };

  const verifyCode = async () => {
    if (!code.trim() || code.length !== 6) {
      toast.error('אנא הזן קוד אימות תקין (6 ספרות)');
      return;
    }

    setIsLoading(true);
    try {
      // Verify code through edge function
      const { data, error } = await supabase.functions.invoke('verify-sms-code', {
        body: {
          phoneNumber,
          code
        }
      });

      if (error || !data?.verified) {
        toast.error('קוד אימות שגוי או פג תוקף');
        return;
      }

      toast.success('המספר אומת בהצלחה!');
      onVerificationComplete(true);
    } catch (error) {
      console.error('Error verifying code:', error);
      toast.error('שגיאה באימות הקוד');
    } finally {
      setIsLoading(false);
    }
  };

  // Send initial verification code when component mounts
  useEffect(() => {
    sendVerificationCode();
  }, []);

  return (
    <Card className="border-border shadow-lg animate-fade-in">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">אימות מספר טלפון</CardTitle>
        <CardDescription>
          נשלח קוד אימות למספר {phoneNumber}
          <br />
          אנא הזן את הקוד בן 6 הספרות
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Input
            type="text"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="text-center text-lg tracking-widest"
            maxLength={6}
          />
        </div>

        <div className="space-y-2">
          <Button 
            onClick={verifyCode} 
            className="w-full" 
            disabled={isLoading || code.length !== 6}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                מאמת...
              </span>
            ) : (
              'אמת קוד'
            )}
          </Button>

          <Button
            variant="outline"
            onClick={sendVerificationCode}
            className="w-full"
            disabled={isResending || countdown > 0}
          >
            {isResending ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                שולח...
              </span>
            ) : countdown > 0 ? (
              `שלח שוב בעוד ${countdown} שניות`
            ) : (
              'שלח קוד שוב'
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={onBack}
            className="w-full"
          >
            חזור לעריכת פרטים
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SmsVerification;