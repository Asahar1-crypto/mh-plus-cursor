import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ModernButton } from '@/components/ui/modern-button';
import { Smartphone, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { Link } from 'react-router-dom';
import { CountryCode } from 'libphonenumber-js';
import { InternationalPhoneInput } from '@/components/ui/international-phone-input';
import { normalizePhoneNumber } from '@/utils/phoneUtils';
import OtpVerification from './OtpVerification';

interface PhoneLoginProps {
  onBack: () => void;
  hideHeader?: boolean;
}

const PhoneLogin: React.FC<PhoneLoginProps> = ({ onBack, hideHeader = false }) => {
  const { sendPhoneOtp, isLoading } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState(() => {
    return sessionStorage.getItem('phoneLogin_phoneNumber') || '';
  });
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(() => {
    return (sessionStorage.getItem('phoneLogin_country') as CountryCode) || 'IL';
  });
  const [showOtpVerification, setShowOtpVerification] = useState(() => {
    return sessionStorage.getItem('phoneLogin_showOtp') === 'true';
  });
  const [userInfo, setUserInfo] = useState<{ userId?: string; userName?: string }>(() => {
    const stored = sessionStorage.getItem('phoneLogin_userInfo');
    return stored ? JSON.parse(stored) : {};
  });
  const [phoneError, setPhoneError] = useState('');

  // Save state to sessionStorage whenever it changes
  React.useEffect(() => {
    sessionStorage.setItem('phoneLogin_showOtp', showOtpVerification.toString());
  }, [showOtpVerification]);

  React.useEffect(() => {
    sessionStorage.setItem('phoneLogin_userInfo', JSON.stringify(userInfo));
  }, [userInfo]);

  React.useEffect(() => {
    sessionStorage.setItem('phoneLogin_phoneNumber', phoneNumber);
  }, [phoneNumber]);

  React.useEffect(() => {
    sessionStorage.setItem('phoneLogin_country', selectedCountry);
  }, [selectedCountry]);

  const handlePhoneChange = (value: string) => {
    setPhoneError('');
    setPhoneNumber(value);
  };

  const handleCountryChange = (country: CountryCode) => {
    setSelectedCountry(country);
    setPhoneError('');
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!phoneNumber.trim()) {
      setPhoneError('אנא הזן מספר טלפון');
      return;
    }

    const validationResult = normalizePhoneNumber(phoneNumber, selectedCountry);
    if (!validationResult.success) {
      setPhoneError(validationResult.error || 'מספר טלפון לא תקין');
      return;
    }

    try {
      const normalizedPhone = validationResult.data!.e164;
      const result = await sendPhoneOtp(normalizedPhone);
      
      if (result && result.userId) {
        const newUserInfo = {
          userId: result.userId,
          userName: result.userName
        };
        
        sessionStorage.setItem('phoneLogin_userInfo', JSON.stringify(newUserInfo));
        sessionStorage.setItem('phoneLogin_showOtp', 'true');
        
        setUserInfo(newUserInfo);
        setShowOtpVerification(true);
      } else {
        setPhoneError('שגיאה בשליחת קוד האימות');
      }
    } catch (error: any) {
      
      // Handle specific errors from the backend
      if (error.message?.includes('Phone number not registered')) {
        setPhoneError('מספר הטלפון לא רשום במערכת. אנא הירשם תחילה.');
      } else if (error.message?.includes('Too many attempts')) {
        setPhoneError('יותר מדי נסיונות. נסה שוב מאוחר יותר');
      } else {
        setPhoneError('שגיאה בשליחת קוד האימות');
      }
    }
  };

  const handleBackToPhoneInput = () => {
    setShowOtpVerification(false);
    setUserInfo({});
    setPhoneNumber('');
    setSelectedCountry('IL');
    setPhoneError('');
    // Clear all phone login related sessionStorage
    sessionStorage.removeItem('phoneLogin_showOtp');
    sessionStorage.removeItem('phoneLogin_userInfo');
    sessionStorage.removeItem('phoneLogin_phoneNumber');
    sessionStorage.removeItem('phoneLogin_country');
    sessionStorage.removeItem('phoneLoginInProgress');
  };

  if (showOtpVerification) {
    const validationResult = normalizePhoneNumber(phoneNumber, selectedCountry);
    const normalizedPhone = validationResult.success ? validationResult.data!.e164 : phoneNumber;
    
    return (
      <OtpVerification
        phoneNumber={normalizedPhone}
        displayNumber={phoneNumber}
        userInfo={userInfo}
        onBack={handleBackToPhoneInput}
        onSuccess={() => {
          // Handle successful login
        }}
      />
    );
  }

  if (hideHeader) {
    return (
      <div className="space-y-4">
        <InternationalPhoneInput
          label="מספר טלפון"
          value={phoneNumber}
          onChange={handlePhoneChange}
          onCountryChange={handleCountryChange}
          defaultCountry={selectedCountry}
          validation={phoneError ? 'invalid' : 'none'}
          validationMessage={phoneError}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSendOtp(e);
            }
          }}
        />
        
        {phoneError && phoneError.includes('לא רשום במערכת') && (
          <div className="text-center">
            <Link 
              to="/register" 
              className="text-sm text-primary hover:text-primary-glow hover:underline font-medium inline-flex items-center gap-1"
            >
              לחץ כאן להרשמה 
              <span className="text-xs">←</span>
            </Link>
          </div>
        )}

        <ModernButton 
          type="button"
          onClick={handleSendOtp}
          disabled={isLoading || !phoneNumber.trim()}
          className="w-full h-12 text-base font-semibold rounded-xl shadow-lg hover:shadow-glow transition-all duration-300"
          size="lg"
          loading={isLoading}
          variant="primary"
        >
          {isLoading ? 'שולח קוד...' : (
            <span className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              שלח קוד אימות
            </span>
          )}
        </ModernButton>

        <p className="text-center text-xs text-muted-foreground/70 leading-relaxed">
          קוד אימות יישלח ב-SMS למספר שלך
          <br />
          הקוד תקף למשך 10 דקות
        </p>
      </div>
    );
  }

  return (
    <Card className="border-border shadow-lg animate-fade-in glass shadow-card">
      <CardHeader className="text-center">
        {/* Mobile wallet characters */}
        <div className="lg:hidden flex justify-center gap-4 mb-4">
          <img 
            src="/lovable-uploads/3a973532-2477-462a-9a84-0390b7045844.png" 
            alt="Red Wallet Character" 
            className="w-28 h-28 object-contain animate-bounce [animation-duration:2s]"
          />
          <img 
            src="/lovable-uploads/3d7094a5-211e-416b-a8c4-8fd864c98499.png" 
            alt="Green Wallet Character" 
            className="w-28 h-28 object-contain animate-bounce [animation-duration:2s] [animation-delay:0.3s]"
          />
        </div>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Smartphone className="w-6 h-6 text-primary animate-pulse" />
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            התחברות עם טלפון
          </CardTitle>
        </div>
        <CardDescription>
          הזן את מספר הטלפון הרשום כבר במערכת
          <br />
          <span className="text-sm text-muted-foreground">
            אם עדיין לא נרשמת, <Link to="/register" className="text-primary hover:text-primary-glow hover:underline">לחץ כאן להירשם</Link>
          </span>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <InternationalPhoneInput
          label="מספר טלפון"
          value={phoneNumber}
          onChange={handlePhoneChange}
          onCountryChange={handleCountryChange}
          defaultCountry={selectedCountry}
          validation={phoneError ? 'invalid' : 'none'}
          validationMessage={phoneError}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSendOtp(e);
            }
          }}
        />
        
        {phoneError && phoneError.includes('לא רשום במערכת') && (
          <div className="text-center">
            <Link 
              to="/register" 
              className="text-sm text-primary hover:text-primary-glow hover:underline font-medium inline-flex items-center gap-1"
            >
              לחץ כאן להרשמה 
              <span className="text-xs">←</span>
            </Link>
          </div>
        )}

        <div className="space-y-3">
          <Button 
            type="button"
            onClick={handleSendOtp}
            disabled={isLoading || !phoneNumber.trim()}
            className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary text-white font-semibold py-3 text-lg shadow-lg transform transition-all duration-200 hover:scale-105 disabled:transform-none"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
                שולח קוד...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                שלח קוד אימות
              </span>
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={onBack}
            className="w-full flex items-center gap-2 hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            חזור לאימייל וסיסמה
          </Button>
        </div>

        <div className="text-center text-xs text-muted-foreground">
          <p>קוד האימות יישלח בהודעת SMS למספר שלך</p>
          <p>הקוד תקף למשך 10 דקות בלבד</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PhoneLogin;