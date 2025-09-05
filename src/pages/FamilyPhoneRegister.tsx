import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useInvitationDetails } from '@/hooks/useInvitationDetails';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InternationalPhoneInput } from '@/components/ui/international-phone-input';
import LoadingState from '@/components/invitation/LoadingState';
import ErrorState from '@/components/invitation/ErrorState';
import { Users, Eye, EyeOff, Smartphone } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { normalizePhoneNumber } from '@/utils/phoneUtils';
import { CountryCode } from 'libphonenumber-js';
import FamilyOtpVerification from '@/components/auth/FamilyOtpVerification';
import AnimatedBackground from '@/components/ui/animated-background';

const registerSchema = z.object({
  name: z.string().min(2, 'השם חייב להכיל לפחות 2 תווים'),
  password: z.string().min(6, 'הסיסמה חייבת להכיל לפחות 6 תווים'),
  confirmPassword: z.string(),
  phoneNumber: z.string().min(10, 'מספר טלפון לא תקין'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "הסיסמאות לא תואמות",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const FamilyPhoneRegister = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const invitationId = searchParams.get('invitationId');
  const { status, invitationDetails, errorMessage } = useInvitationDetails(invitationId);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('IL');
  const [phoneError, setPhoneError] = useState('');
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [familyInfo, setFamilyInfo] = useState<{
    name: string;
    email: string;
    invitationId: string;
    password: string;
    phone: string;
    displayPhone: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema)
  });

  // Auto-fill email from invitation (read-only)
  const email = invitationDetails?.email || '';

  const handlePhoneChange = (value: string) => {
    setPhoneError('');
    setValue('phoneNumber', value);
  };

  const handleCountryChange = (country: CountryCode) => {
    setSelectedCountry(country);
    setPhoneError('');
  };

  const onSubmit = async (data: RegisterFormData) => {
    if (!invitationId) {
      toast.error('מזהה הזמנה חסר');
      return;
    }

    // Validate phone number
    const validationResult = normalizePhoneNumber(data.phoneNumber, selectedCountry);
    if (!validationResult.success) {
      setPhoneError(validationResult.error || 'מספר טלפון לא תקין');
      return;
    }

    setIsSubmitting(true);
    try {
      const normalizedPhone = validationResult.data!.e164;
      
      console.log('Family registration data:', {
        ...data,
        email,
        invitationId,
        normalizedPhone
      });
      
      // Set family info and move to OTP verification
      const newFamilyInfo = {
        name: data.name,
        email,
        invitationId,
        password: data.password,
        phone: normalizedPhone,
        displayPhone: data.phoneNumber
      };
      
      setFamilyInfo(newFamilyInfo);
      setShowOtpVerification(true);
      
      toast.success('נשלח קוד אימות ל-' + data.phoneNumber);
      
    } catch (error: any) {
      console.error('Registration failed:', error);
      toast.error(`שגיאה ברישום: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToForm = () => {
    setShowOtpVerification(false);
    setFamilyInfo(null);
  };

  const handleSuccess = () => {
    // This will be handled by FamilyOtpVerification
    console.log('Family registration successful');
  };

  if (status === 'loading') {
    return (
      <>
        <AnimatedBackground />
        <div className="container mx-auto py-10 px-4 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
          <LoadingState />
        </div>
      </>
    );
  }

  if (status === 'error' || !invitationDetails) {
    return (
      <>
        <AnimatedBackground />
        <div className="container mx-auto py-10 px-4 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
          <ErrorState message={errorMessage || 'ההזמנה לא נמצאה או שפגה תוקפה'} />
        </div>
      </>
    );
  }

  if (showOtpVerification && familyInfo) {
    return (
      <>
        <AnimatedBackground />
        <div className="container mx-auto py-10 px-4 flex items-center justify-center min-h-[calc(100vh-4rem)]" dir="rtl">
          <div className="w-full max-w-md">
            <FamilyOtpVerification
              phoneNumber={familyInfo.phone}
              displayNumber={familyInfo.displayPhone}
              familyInfo={{
                name: familyInfo.name,
                email: familyInfo.email,
                invitationId: familyInfo.invitationId,
                password: familyInfo.password
              }}
              onBack={handleBackToForm}
              onSuccess={handleSuccess}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AnimatedBackground />
      <div className="container mx-auto py-10 px-4 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]" dir="rtl">
        <div className="w-full max-w-7xl">
          <div className="grid lg:grid-cols-5 gap-8 items-center" dir="ltr">
            {/* Left Wallet Character - Green */}
            <div className="hidden lg:flex flex-col items-center justify-center p-8 animate-fade-in">
              <div className="relative">
                <img 
                  src="/lovable-uploads/3d7094a5-211e-416b-a8c4-8fd864c98499.png" 
                  alt="Green Wallet Character" 
                  className="w-64 h-64 object-contain animate-bounce [animation-duration:3s]"
                />
                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-32 h-8 bg-black/10 rounded-full blur-md animate-pulse"></div>
              </div>
            </div>

            {/* Registration Card - Center (3 columns) */}
            <div className="w-full max-w-xl mx-auto lg:mx-0 lg:col-span-3" dir="rtl">
              <Card className="border-border shadow-xl animate-fade-in glass shadow-card p-2">
                <CardHeader className="text-center pb-8 pt-8">
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
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                    הצטרפות למשפחה
                  </CardTitle>
                  <CardDescription>
                    הצטרפות לחשבון "{invitationDetails.accountName}"
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6 px-8 pb-8">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Name field */}
                    <div className="space-y-3">
                      <Label htmlFor="name" className="text-base font-medium">שם מלא *</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="הזן את שמך המלא"
                        {...register('name')}
                        className={`h-12 text-base ${errors.name ? 'border-destructive' : ''}`}
                      />
                      {errors.name && (
                        <p className="text-sm text-destructive">{errors.name.message}</p>
                      )}
                    </div>

                    {/* Email field (read-only) */}
                    <div className="space-y-3">
                      <Label htmlFor="email" className="text-base font-medium">כתובת אימייל</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        readOnly
                        className="bg-muted cursor-not-allowed h-12 text-base"
                      />
                      <p className="text-xs text-muted-foreground">
                        כתובת האימייל נקבעת על פי ההזמנה ולא ניתן לשנותה
                      </p>
                    </div>

                    {/* Phone field */}
                    <div className="space-y-3">
                      <Label htmlFor="phoneNumber" className="text-base font-medium">מספר טלפון *</Label>
                      <InternationalPhoneInput
                        label=""
                        value={watch('phoneNumber') || ''}
                        onChange={handlePhoneChange}
                        onCountryChange={handleCountryChange}
                        defaultCountry={selectedCountry}
                        validation={phoneError ? 'invalid' : watch('phoneNumber') && watch('phoneNumber').startsWith('+') && watch('phoneNumber').length >= 10 ? 'valid' : 'none'}
                        validationMessage={phoneError}
                      />
                      <p className="text-xs text-muted-foreground">
                        נשלח קוד אימות למספר הטלפון לאימות
                      </p>
                    </div>

                    {/* Password field */}
                    <div className="space-y-3">
                      <Label htmlFor="password" className="text-base font-medium">סיסמה *</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="הזן סיסמה"
                          {...register('password')}
                          className={`h-12 text-base pr-10 ${errors.password ? 'border-destructive' : ''}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {errors.password && (
                        <p className="text-sm text-destructive">{errors.password.message}</p>
                      )}
                    </div>

                    {/* Confirm Password field */}
                    <div className="space-y-3">
                      <Label htmlFor="confirmPassword" className="text-base font-medium">אישור סיסמה *</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="הזן שוב את הסיסמה"
                          {...register('confirmPassword')}
                          className={`h-12 text-base pr-10 ${errors.confirmPassword ? 'border-destructive' : ''}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                      )}
                    </div>

                    {/* Submit button */}
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary text-white font-semibold py-3 text-lg shadow-lg transform transition-all duration-200 hover:scale-105 disabled:transform-none h-12" 
                      size="lg"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
                          נרשם...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Smartphone className="w-5 h-5" />
                          המשך לאימות טלפון
                        </span>
                      )}
                    </Button>

                    {/* Account info */}
                    <div className="text-center pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        מוזמן על ידי: <span className="font-medium">{invitationDetails.ownerName}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        חשבון: <span className="font-medium">{invitationDetails.accountName}</span>
                      </p>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right Wallet Character - Red */}
            <div className="hidden lg:flex flex-col items-center justify-center p-8 animate-fade-in">
              <div className="relative">
                <img 
                  src="/lovable-uploads/3a973532-2477-462a-9a84-0390b7045844.png" 
                  alt="Red Wallet Character" 
                  className="w-64 h-64 object-contain animate-bounce [animation-duration:3s] [animation-delay:0.5s]"
                />
                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-32 h-8 bg-black/10 rounded-full blur-md animate-pulse [animation-delay:0.5s]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FamilyPhoneRegister;