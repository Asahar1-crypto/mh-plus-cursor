import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Smartphone, Mail, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { Link } from 'react-router-dom';
import OtpVerification from './OtpVerification';

interface PhoneLoginProps {
  onBack: () => void;
  hideHeader?: boolean;
}

const PhoneLogin: React.FC<PhoneLoginProps> = ({ onBack, hideHeader = false }) => {
  const { sendPhoneOtp, isLoading } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState(() => {
    const stored = sessionStorage.getItem('phoneLogin_phoneNumber') || '';
    console.log('PhoneLogin: Loading phoneNumber from sessionStorage:', stored);
    return stored;
  });
  const [showOtpVerification, setShowOtpVerification] = useState(() => {
    const stored = sessionStorage.getItem('phoneLogin_showOtp') === 'true';
    console.log('PhoneLogin: Loading showOtpVerification from sessionStorage:', stored);
    return stored;
  });
  const [userInfo, setUserInfo] = useState<{ userId?: string; userName?: string }>(() => {
    const stored = sessionStorage.getItem('phoneLogin_userInfo');
    const parsed = stored ? JSON.parse(stored) : {};
    console.log('PhoneLogin: Loading userInfo from sessionStorage:', parsed);
    return parsed;
  });
  const [phoneError, setPhoneError] = useState('');

  // Save state to sessionStorage whenever it changes
  React.useEffect(() => {
    sessionStorage.setItem('phoneLogin_showOtp', showOtpVerification.toString());
    console.log('PhoneLogin state changed - showOtpVerification:', showOtpVerification);
  }, [showOtpVerification]);

  React.useEffect(() => {
    sessionStorage.setItem('phoneLogin_userInfo', JSON.stringify(userInfo));
    console.log('PhoneLogin userInfo changed:', userInfo);
  }, [userInfo]);

  React.useEffect(() => {
    sessionStorage.setItem('phoneLogin_phoneNumber', phoneNumber);
  }, [phoneNumber]);

  const normalizePhoneNumber = (phone: string): string => {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    
    // Format Israeli phone number
    if (digitsOnly.startsWith('972')) {
      return `+${digitsOnly}`;
    } else if (digitsOnly.startsWith('0')) {
      return `+972${digitsOnly.substring(1)}`;
    } else if (digitsOnly.length === 9) {
      return `+972${digitsOnly}`;
    }
    
    return `+972${digitsOnly}`;
  };

  const formatDisplayNumber = (phone: string): string => {
    const digitsOnly = phone.replace(/\D/g, '');
    
    if (digitsOnly.length >= 10) {
      // Format as: 0XX-XXX-XXXX
      const formatted = digitsOnly.replace(/^972/, '0').replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
      return formatted;
    }
    
    return phone;
  };

  const handlePhoneChange = (value: string) => {
    setPhoneError('');
    const formatted = formatDisplayNumber(value);
    setPhoneNumber(formatted);
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const digitsOnly = phone.replace(/\D/g, '');
    
    // Israeli phone number validation
    if (digitsOnly.startsWith('972')) {
      return digitsOnly.length === 12; // +972XXXXXXXXX
    } else if (digitsOnly.startsWith('0')) {
      return digitsOnly.length === 10; // 0XXXXXXXXX
    } else {
      return digitsOnly.length === 9; // XXXXXXXXX
    }
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    // Prevent form submission from refreshing the page
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!phoneNumber.trim()) {
      setPhoneError('אנא הזן מספר טלפון');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      setPhoneError('מספר טלפון לא תקין');
      return;
    }

    try {
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      console.log('Sending OTP to:', normalizedPhone);
      
      const result = await sendPhoneOtp(normalizedPhone);
      console.log('OTP sent successfully, result:', result);
      
      if (result && result.userId) {
        const newUserInfo = {
          userId: result.userId,
          userName: result.userName
        };
        
        // Save immediately to sessionStorage BEFORE setting state
        sessionStorage.setItem('phoneLogin_userInfo', JSON.stringify(newUserInfo));
        sessionStorage.setItem('phoneLogin_showOtp', 'true');
        
        setUserInfo(newUserInfo);
        setShowOtpVerification(true);
        
        console.log('Moving to OTP verification screen');
      } else {
        setPhoneError('שגיאה בשליחת קוד האימות');
      }
    } catch (error: any) {
      console.error('Failed to send OTP:', error);
      
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
    setPhoneError('');
    // Clear all phone login related sessionStorage
    sessionStorage.removeItem('phoneLogin_showOtp');
    sessionStorage.removeItem('phoneLogin_userInfo');
    sessionStorage.removeItem('phoneLogin_phoneNumber');
    sessionStorage.removeItem('phoneLoginInProgress');
  };

  if (showOtpVerification) {
    console.log('PhoneLogin: Rendering OTP verification with:', {
      phoneNumber,
      displayNumber: phoneNumber,
      userInfo,
      showOtpVerification
    });
    return (
      <OtpVerification
        phoneNumber={normalizePhoneNumber(phoneNumber)}
        displayNumber={phoneNumber}
        userInfo={userInfo}
        onBack={handleBackToPhoneInput}
        onSuccess={() => {
          // Handle successful login
          console.log('Phone login successful');
        }}
      />
    );
  }

  console.log('PhoneLogin: Rendering phone input form with:', {
    phoneNumber,
    showOtpVerification,
    userInfo
  });

  if (hideHeader) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground">
            הזן את מספר הטלפון הרשום כבר במערכת
            <br />
            <span className="text-xs text-muted-foreground">
              אם עדיין לא נרשמת, <Link to="/register" className="text-primary hover:text-primary-glow hover:underline">לחץ כאן להירשם</Link>
            </span>
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phoneNumber" className="text-sm font-medium">
            מספר טלפון
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <span className="text-muted-foreground text-sm">🇮🇱 +972</span>
            </div>
            <Input
              id="phoneNumber"
              type="tel"
              placeholder="050-123-4567"
              value={phoneNumber}
              onChange={(e) => handlePhoneChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendOtp(e);
                }
              }}
              className={`pl-20 text-lg ${phoneError ? 'border-destructive' : ''} transition-all duration-200 focus:shadow-glow`}
              maxLength={12}
            />
          </div>
          {phoneError && (
            <div className="space-y-2">
              <p className="text-sm text-destructive animate-fade-in">{phoneError}</p>
              {phoneError.includes('לא רשום במערכת') && (
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
            </div>
          )}
        </div>

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
        <div className="space-y-2">
          <Label htmlFor="phoneNumber" className="text-sm font-medium">
            מספר טלפון
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <span className="text-muted-foreground text-sm">🇮🇱 +972</span>
            </div>
            <Input
              id="phoneNumber"
              type="tel"
              placeholder="050-123-4567"
              value={phoneNumber}
              onChange={(e) => handlePhoneChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendOtp(e);
                }
              }}
              className={`pl-20 text-lg ${phoneError ? 'border-destructive' : ''} transition-all duration-200 focus:shadow-glow`}
              maxLength={12}
            />
          </div>
          {phoneError && (
            <div className="space-y-2">
              <p className="text-sm text-destructive animate-fade-in">{phoneError}</p>
              {phoneError.includes('לא רשום במערכת') && (
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
            </div>
          )}
        </div>

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