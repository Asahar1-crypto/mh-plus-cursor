import React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import SmsVerification from '@/components/auth/SmsVerification';

const FamilyOtp: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get data from navigation state OR search params (for backwards compatibility)
  const name = location.state?.name || searchParams.get('name');
  const email = location.state?.email || searchParams.get('email');
  const phone = location.state?.phone || searchParams.get('phone');
  const invitationId = location.state?.invitationId || searchParams.get('invitationId');

  const handleVerificationComplete = async (verified: boolean, data?: any) => {
    if (!verified) {
      return;
    }

    try {
      // Call edge function to complete family registration
      const { data: registrationData, error } = await supabase.functions.invoke('complete-family-registration', {
        body: {
          name,
          email,
          phone,
          invitationId
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

      toast.success('הרישום הושלם בהצלחה! אתה כעת חבר בחשבון המשפחתי');

      // Consume the magic-link token_hash to create the session.
      if (registrationData.token_hash) {
        const { error: verifyOtpError } = await supabase.auth.verifyOtp({
          token_hash: registrationData.token_hash,
          type: 'magiclink',
        });
        if (verifyOtpError) {
          console.error('verifyOtp failed after family registration:', verifyOtpError);
        }
      }

      const hasSession = !!(await supabase.auth.getSession()).data.session;
      setTimeout(() => {
        if (hasSession) {
          navigate('/dashboard');
        } else {
          navigate('/login', {
            state: {
              email,
              message: 'הרישום הושלם בהצלחה! המייל שלך אומת אוטומטית. אנא התחבר'
            }
          });
        }
      }, 2000);

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
      <div className="container mx-auto py-6 sm:py-10 px-3 sm:px-4 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]" dir="rtl">
        <div className="text-center">
          <p className="text-destructive">נתונים חסרים לאימות</p>
          <button 
            onClick={() => navigate('/family-register')} 
            className="mt-4 text-primary underline"
          >
            חזור לרישום
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 sm:py-10 px-3 sm:px-4 flex items-center justify-center min-h-[calc(100vh-4rem)]" dir="rtl">
      <div className="w-full max-w-md">
        <SmsVerification
          phoneNumber={phone}
          verificationType="family_registration"
          onVerificationComplete={handleVerificationComplete}
          onBack={handleBack}
        />
      </div>
    </div>
  );
};

export default FamilyOtp;