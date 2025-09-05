import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useConfetti } from '@/components/ui/confetti';
import { CelebrationModal } from '@/components/ui/celebration-modal';

const FamilyOtp = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const invitationId = searchParams.get('invitationId');
  const phone = decodeURIComponent(searchParams.get('phone') || '');
  const name = decodeURIComponent(searchParams.get('name') || '');
  const email = decodeURIComponent(searchParams.get('email') || '');
  
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const { isActive: confettiActive, fire: fireConfetti, ConfettiComponent } = useConfetti();

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
          phoneNumber: phone,
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
          phoneNumber: phone,
          code,
          verificationType: 'registration'
        }
      });

      if (error || !data?.verified) {
        toast.error('קוד אימות שגוי או פג תוקף');
        return;
      }

      // הפעלת קונפטי וחגיגה
      fireConfetti();
      setShowCelebration(true);
      toast.success('המספר אומת בהצלחה! 🎉');
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

  const handleCelebrationClose = async () => {
    setShowCelebration(false);
    
    // Complete family registration after successful verification
    await completeRegistration();
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

  const handleBack = () => {
    navigate(-1);
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
      <Card className="border-border shadow-lg animate-fade-in">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">אימות מספר טלפון</CardTitle>
          <CardDescription>
            נשלח קוד אימות למספר {phone}
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
              onClick={handleBack}
              className="w-full"
            >
              חזור לעריכת פרטים
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confetti Animation */}
      <ConfettiComponent duration={4000} particleCount={100} />

      {/* Success Celebration Modal */}
      <CelebrationModal
        isOpen={showCelebration}
        title="🎉 ברכות!"
        message="מספר הטלפון שלך אומת בהצלחה! ברוכים הבאים לאפליקציה"
        onClose={handleCelebrationClose}
      />
    </div>
  );
};

export default FamilyOtp;