import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Phone, Shield } from 'lucide-react';

interface PhoneVerificationProps {
  onVerificationComplete?: (phoneNumber: string) => void;
}

export const PhoneVerification: React.FC<PhoneVerificationProps> = ({ 
  onVerificationComplete 
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [isLoading, setIsLoading] = useState(false);

  const sendVerificationCode = async () => {
    if (!phoneNumber) {
      toast.error('אנא הזן מספר טלפון');
      return;
    }

    // Validate Israeli phone number format
    const israeliPhoneRegex = /^(\+972|972|0)?[2-9]\d{7,8}$/;
    if (!israeliPhoneRegex.test(phoneNumber.replace(/[-\s]/g, ''))) {
      toast.error('אנא הזן מספר טלפון ישראלי תקין');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          phone_number: phoneNumber,
          purpose: 'verification'
        }
      });

      if (error) {
        console.error('Error sending SMS:', error);
        toast.error('שגיאה בשליחת קוד האימות');
        return;
      }

      if (data?.success) {
        setStep('code');
        toast.success('קוד האימות נשלח בהצלחה');
        
        // Show debug code in development
        if (data.debug_code) {
          toast.info(`קוד לבדיקה: ${data.debug_code}`, { duration: 10000 });
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('שגיאה בשליחת קוד האימות');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode) {
      toast.error('אנא הזן קוד אימות');
      return;
    }

    if (verificationCode.length !== 6) {
      toast.error('קוד האימות חייב להכיל 6 ספרות');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-sms', {
        body: {
          phone_number: phoneNumber,
          code: verificationCode,
          purpose: 'verification'
        }
      });

      if (error) {
        console.error('Error verifying SMS:', error);
        toast.error('שגיאה באימות הקוד');
        return;
      }

      if (data?.success) {
        toast.success('מספר הטלפון אומת בהצלחה!');
        onVerificationComplete?.(phoneNumber);
      } else if (data?.code === 'TOO_MANY_ATTEMPTS') {
        toast.error(data.error);
        setStep('phone');
        setVerificationCode('');
      } else {
        toast.error(data?.error || 'קוד אימות שגוי');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('שגיאה באימות הקוד');
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    setStep('phone');
    setVerificationCode('');
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          {step === 'phone' ? (
            <Phone className="h-5 w-5 text-primary" />
          ) : (
            <Shield className="h-5 w-5 text-primary" />
          )}
          <CardTitle>
            {step === 'phone' ? 'אימות מספר טלפון' : 'הזן קוד אימות'}
          </CardTitle>
        </div>
        <CardDescription>
          {step === 'phone' 
            ? 'הזן את מספר הטלפון שלך לקבלת קוד אימות'
            : `נשלח קוד אימות למספר ${phoneNumber}`
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'phone' ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="phone">מספר טלפון</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="050-1234567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isLoading}
                dir="ltr"
              />
            </div>
            <Button 
              onClick={sendVerificationCode} 
              disabled={isLoading || !phoneNumber}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  שולח קוד...
                </>
              ) : (
                'שלח קוד אימות'
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="code">קוד אימות (6 ספרות)</Label>
              <Input
                id="code"
                type="text"
                placeholder="123456"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={isLoading}
                dir="ltr"
                className="text-center text-lg tracking-widest"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={goBack}
                disabled={isLoading}
                className="flex-1"
              >
                חזור
              </Button>
              <Button 
                onClick={verifyCode} 
                disabled={isLoading || verificationCode.length !== 6}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    מאמת...
                  </>
                ) : (
                  'אמת קוד'
                )}
              </Button>
            </div>
            <Button
              variant="ghost"
              onClick={sendVerificationCode}
              disabled={isLoading}
              className="w-full text-sm"
            >
              שלח קוד מחדש
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};