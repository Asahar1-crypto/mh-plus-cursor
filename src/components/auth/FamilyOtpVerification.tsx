import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Smartphone, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useConfetti } from '@/components/ui/confetti';
import { CelebrationModal } from '@/components/ui/celebration-modal';
import { useNavigate } from 'react-router-dom';

interface FamilyOtpVerificationProps {
  phoneNumber: string;
  displayNumber: string;
  familyInfo: {
    name: string;
    email: string;
    invitationId: string;
    password: string;
  };
  onBack: () => void;
  onSuccess: () => void;
}

const FamilyOtpVerification: React.FC<FamilyOtpVerificationProps> = ({
  phoneNumber,
  displayNumber,
  familyInfo,
  onBack,
  onSuccess
}) => {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const { isActive: confettiActive, fire: fireConfetti, ConfettiComponent } = useConfetti();
  const navigate = useNavigate();

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
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          phoneNumber,
          type: 'verification',
          verificationType: 'family_registration'
        }
      });

      if (error) {
        console.error('Error sending SMS:', error);
        toast.error(`שגיאה בשליחת קוד האימות: ${error.message}`);
      } else {
        toast.success('קוד האימות נשלח בהצלחה');
        setCountdown(60); // Start 60 second countdown
      }
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      toast.error(`שגיאה בשליחת קוד האימות: ${error.message}`);
    } finally {
      setIsResending(false);
    }
  };

  // Send initial verification code when component mounts
  useEffect(() => {
    sendVerificationCode();
  }, []);

  const verifyCode = async () => {
    if (!code.trim() || code.length !== 6) {
      toast.error('אנא הזן קוד אימות תקין (6 ספרות)');
      return;
    }

    setIsVerifying(true);
    try {
      // Verify code through edge function
      const { data, error } = await supabase.functions.invoke('verify-sms-code', {
        body: {
          phoneNumber,
          code,
          verificationType: 'family_registration'
        }
      });

      if (error) {
        // Parse specific error message from edge function response body
        let errorMessage = 'קוד אימות שגוי או פג תוקף';
        try {
          const errorBody = await (error as any).context?.json?.();
          if (errorBody?.error) errorMessage = errorBody.error;
        } catch { /* keep default */ }
        toast.error(errorMessage);
        return;
      }
      if (!data?.verified) {
        toast.error(data?.error || 'קוד אימות שגוי או פג תוקף');
        return;
      }

      // הפעלת קונפטי וחגיגה
      fireConfetti();
      setShowCelebration(true);
      toast.success('המספר אומת בהצלחה! 🎉');
    } catch (error: any) {
      console.error('Error verifying code:', error);
      toast.error('שגיאה באימות הקוד');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCelebrationClose = async () => {
    setShowCelebration(false);
    
    try {
      // Call edge function to complete family registration
      const { data: registrationData, error } = await supabase.functions.invoke('complete-family-registration', {
        body: {
          name: familyInfo.name,
          email: familyInfo.email,
          phone: phoneNumber,
          invitationId: familyInfo.invitationId,
          password: familyInfo.password
        }
      });

      if (error) {
        console.error('Family registration error:', error);
        toast.error(`שגיאה בהשלמת הרישום: ${error.message}`);
        return;
      }

      if (!registrationData?.success) {
        console.error('Family registration failed:', registrationData);
        toast.error(registrationData?.error || 'שגיאה בהשלמת הרישום');
        return;
      }

      // Show promotion-aware success message
      // The RPC returns expenses_transferred; handle both key names for robustness
      const promoExpenses = registrationData.promotionResult?.expenses_transferred || registrationData.promotionResult?.expenses_updated || 0;
      if (promoExpenses > 0) {
        const count = promoExpenses;
        toast.success(
          `שלום ${familyInfo.name}! הרישום הושלם בהצלחה. ${count} הוצאות הועברו לחשבון שלך.`,
          { duration: 8000 }
        );
      } else {
        toast.success('הרישום הושלם בהצלחה! אתה כעת חבר בחשבון המשפחתי');
      }

      // Set session directly using tokens from the edge function
      if (registrationData.access_token && registrationData.refresh_token) {
        await supabase.auth.setSession({
          access_token: registrationData.access_token,
          refresh_token: registrationData.refresh_token
        });
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        // Fallback to login page
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }

    } catch (error: any) {
      console.error('Registration completion error:', error);
      toast.error('שגיאה בהשלמת הרישום: ' + error.message);
    }
  };

  return (
    <>
      <Card className="border-border shadow-lg animate-fade-in glass shadow-card">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Smartphone className="w-6 h-6 text-primary animate-pulse" />
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              אימות מספר טלפון
            </CardTitle>
          </div>
          <CardDescription>
            ברוכים הבאים {familyInfo.name}!
            <br />
            נשלח קוד אימות למספר {displayNumber}
            <br />
            אנא הזן את הקוד בן 6 הספרות
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-2xl tracking-widest font-bold h-16"
              maxLength={6}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  verifyCode();
                }
              }}
            />
          </div>

          <div className="space-y-3">
            <Button 
              onClick={verifyCode} 
              className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary text-white font-semibold py-3 text-lg shadow-lg transform transition-all duration-200 hover:scale-105 disabled:transform-none" 
              disabled={isVerifying || code.length !== 6}
              size="lg"
            >
              {isVerifying ? (
                <span className="flex items-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
                  מאמת...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  אמת קוד
                </span>
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
              className="w-full flex items-center gap-2 hover:bg-muted/50 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              חזור לעריכת פרטים
            </Button>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            <p>קוד האימות תקף למשך 10 דקות בלבד</p>
          </div>
        </CardContent>
      </Card>

      {/* Confetti Animation */}
      <ConfettiComponent duration={4000} particleCount={100} />

      {/* Success Celebration Modal */}
      <CelebrationModal
        isOpen={showCelebration}
        title="🎉 ברכות!"
        message="מספר הטלפון שלך אומת בהצלחה! מושלם הרישום..."
        onClose={handleCelebrationClose}
      />
    </>
  );
};

export default FamilyOtpVerification;