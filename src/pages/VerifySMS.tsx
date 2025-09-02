import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth';

const VerifySMS = () => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { checkAndSetUserData } = useAuth();
  
  const { phoneNumber, email, purpose } = location.state || {};

  useEffect(() => {
    if (!phoneNumber || !email) {
      navigate('/register');
      return;
    }
  }, [phoneNumber, email, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error('הזן קוד בן 6 ספרות');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-sms', {
        body: {
          phone_number: phoneNumber,
          code: code,
          purpose: purpose || 'verification'
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast.success('המספר אומת בהצלחה!');
        
        // If this is for account verification after registration
        if (purpose === 'verification') {
          // Refresh auth state and redirect to dashboard
          await checkAndSetUserData();
          navigate('/dashboard');
        } else {
          // For other purposes (2FA, etc.), go back to previous page
          navigate(-1);
        }
      } else {
        throw new Error(data?.error || 'קוד אימות שגוי');
      }
    } catch (error: any) {
      console.error('SMS verification error:', error);
      toast.error(error.message || 'שגיאה באימות הקוד');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const { error } = await supabase.functions.invoke('send-sms', {
        body: {
          phone_number: phoneNumber,
          purpose: purpose || 'verification'
        }
      });

      if (error) {
        throw error;
      }

      toast.success('קוד חדש נשלח למספר הטלפון');
      setCountdown(60); // 60 second cooldown
    } catch (error: any) {
      console.error('SMS resend error:', error);
      toast.error('שגיאה בשליחת הקוד');
    } finally {
      setIsResending(false);
    }
  };

  if (!phoneNumber || !email) {
    return null;
  }

  return (
    <div className="container mx-auto py-10 px-4 flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-md">
        <Card className="border-border shadow-lg animate-fade-in">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">אימות SMS</CardTitle>
            <CardDescription className="space-y-2">
              <div>שלחנו קוד אימות למספר:</div>
              <div className="font-mono text-lg">{phoneNumber}</div>
              <div className="text-sm">הזן את הקוד שקיבלת:</div>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="text-center text-2xl tracking-widest font-mono"
                maxLength={6}
                dir="ltr"
              />
              <p className="text-sm text-muted-foreground text-center">
                הזן קוד בן 6 ספרות
              </p>
            </div>

            <Button 
              onClick={handleVerify} 
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

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                לא קיבלת קוד?
              </p>
              <Button
                variant="outline"
                onClick={handleResend}
                disabled={isResending || countdown > 0}
                className="w-full"
              >
                {isResending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                    שולח...
                  </span>
                ) : countdown > 0 ? (
                  `שלח שוב בעוד ${countdown} שניות`
                ) : (
                  'שלח קוד חדש'
                )}
              </Button>
            </div>

            <div className="text-center">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/register')}
                className="text-sm"
              >
                חזור לרישום
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifySMS;