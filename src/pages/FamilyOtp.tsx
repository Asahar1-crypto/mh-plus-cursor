import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import SmsVerification from '@/components/auth/SmsVerification';

const FamilyOtp: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get data from navigation state
  const { name, email, phone, invitationId } = location.state || {};

  const handleVerificationComplete = async (verified: boolean, data?: any) => {
    if (!verified) {
      return;
    }

    try {
      console.log('FamilyOtp: Completing family registration with data:', {
        name, email, phone, invitationId
      });

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

      console.log('Family registration completed successfully:', registrationData);
      
      toast.success('הרישום הושלם בהצלחה! אתה כעת חבר בחשבון המשפחתי');
      
      // If we got a magic link, redirect to it for auto-login
      if (registrationData.magicLink) {
        setTimeout(() => {
          window.location.href = registrationData.magicLink;
        }, 2000);
      } else {
        // Fallback to login page
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              email,
              message: 'הרישום הושלם בהצלחה! המייל שלך אומת אוטומטית. אנא התחבר'
            }
          });
        }, 2000);
      }

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
    <div className="container mx-auto py-10 px-4 flex items-center justify-center min-h-[calc(100vh-4rem)]" dir="rtl">
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