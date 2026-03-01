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
import { Users, Eye, EyeOff, Smartphone, Mail } from 'lucide-react';
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
  email: z.string().email('כתובת אימייל לא תקינה'),
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
  const phoneFromUrl = searchParams.get('phone');
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

  // Get phone from invitation or URL
  const invitationPhone = invitationDetails?.phoneNumber || phoneFromUrl || '';
  const hasPrefilledPhone = !!invitationPhone;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: invitationDetails?.email || '',
    }
  });

  // Set phone from invitation when available
  useEffect(() => {
    if (invitationPhone) {
      setValue('phoneNumber', invitationPhone);
    }
  }, [invitationPhone, setValue]);

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
      
      // Set family info and move to OTP verification
      const newFamilyInfo = {
        name: data.name,
        email: data.email,
        invitationId,
        password: data.password,
        phone: normalizedPhone,
        displayPhone: data.phoneNumber
      };
      
      setFamilyInfo(newFamilyInfo);
      setShowOtpVerification(true);
      
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
  };

  if (status === 'loading') {
    return (
      <>
        <AnimatedBackground />
        <div className="container mx-auto py-6 sm:py-10 px-3 sm:px-4 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
          <LoadingState />
        </div>
      </>
    );
  }

  if (status === 'error' || !invitationDetails) {
    return (
      <>
        <AnimatedBackground />
        <div className="container mx-auto py-6 sm:py-10 px-3 sm:px-4 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
          <ErrorState message={errorMessage || 'ההזמנה לא נמצאה או שפגה תוקפה'} />
        </div>
      </>
    );
  }

  if (showOtpVerification && familyInfo) {
    return (
      <>
        <AnimatedBackground />
        <div className="container mx-auto py-6 sm:py-10 px-3 sm:px-4 flex items-center justify-center min-h-[calc(100vh-4rem)]" dir="rtl">
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
      <div className="container mx-auto py-6 sm:py-10 px-3 sm:px-4 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]" dir="rtl">
        <div className="w-full max-w-7xl">
          <div className="grid lg:grid-cols-5 gap-4 sm:gap-8 items-center" dir="ltr">
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
              <Card className="border-border shadow-xl animate-fade-in glass shadow-card p-1 sm:p-2">
                <CardHeader className="text-center pb-4 sm:pb-8 pt-4 sm:pt-8 px-4 sm:px-6">
                  {/* Mobile wallet characters */}
                  <div className="lg:hidden flex justify-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <img 
                      src="/lovable-uploads/3a973532-2477-462a-9a84-0390b7045844.png" 
                      alt="Red Wallet Character" 
                      className="w-20 h-20 sm:w-28 sm:h-28 object-contain animate-bounce [animation-duration:2s]"
                    />
                    <img 
                      src="/lovable-uploads/3d7094a5-211e-416b-a8c4-8fd864c98499.png" 
                      alt="Green Wallet Character" 
                      className="w-20 h-20 sm:w-28 sm:h-28 object-contain animate-bounce [animation-duration:2s] [animation-delay:0.3s]"
                    />
                  </div>
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <Users className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                    הצטרפות למשפחה
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    הצטרפות לחשבון "{invitationDetails.accountName}"
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-8 pb-4 sm:pb-8">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                    {/* Name field */}
                    <div className="space-y-2 sm:space-y-3">
                      <Label htmlFor="name" className="text-sm sm:text-base font-medium">שם מלא *</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="הזן את שמך המלא"
                        {...register('name')}
                        className={`h-10 sm:h-12 text-sm sm:text-base ${errors.name ? 'border-destructive' : ''}`}
                      />
                      {errors.name && (
                        <p className="text-xs sm:text-sm text-destructive">{errors.name.message}</p>
                      )}
                    </div>

                    {/* Email field */}
                    <div className="space-y-2 sm:space-y-3">
                      <Label htmlFor="email" className="text-sm sm:text-base font-medium flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        כתובת אימייל *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="example@email.com"
                        {...register('email')}
                        className={`h-10 sm:h-12 text-sm sm:text-base ${errors.email ? 'border-destructive' : ''}`}
                        dir="ltr"
                      />
                      {errors.email && (
                        <p className="text-xs sm:text-sm text-destructive">{errors.email.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        האימייל ישמש לאיפוס סיסמה ולקבלת התראות
                      </p>
                    </div>

                    {/* Phone field */}
                    <div className="space-y-2 sm:space-y-3">
                      <Label htmlFor="phoneNumber" className="text-sm sm:text-base font-medium flex items-center gap-2">
                        <Smartphone className="w-4 h-4" />
                        מספר טלפון *
                      </Label>
                      {hasPrefilledPhone ? (
                        <>
                          <Input
                            id="phoneNumber"
                            type="tel"
                            value={watch('phoneNumber') || invitationPhone}
                            readOnly
                            className="bg-muted cursor-not-allowed h-10 sm:h-12 text-sm sm:text-base"
                            dir="ltr"
                          />
                          <p className="text-xs text-muted-foreground">
                            מספר הטלפון נקבע על פי ההזמנה
                          </p>
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>

                    {/* Password field */}
                    <div className="space-y-2 sm:space-y-3">
                      <Label htmlFor="password" className="text-sm sm:text-base font-medium">סיסמה *</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="הזן סיסמה"
                          {...register('password')}
                          className={`h-10 sm:h-12 text-sm sm:text-base pr-10 ${errors.password ? 'border-destructive' : ''}`}
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
                        <p className="text-xs sm:text-sm text-destructive">{errors.password.message}</p>
                      )}
                    </div>

                    {/* Confirm Password field */}
                    <div className="space-y-2 sm:space-y-3">
                      <Label htmlFor="confirmPassword" className="text-sm sm:text-base font-medium">אישור סיסמה *</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="הזן שוב את הסיסמה"
                          {...register('confirmPassword')}
                          className={`h-10 sm:h-12 text-sm sm:text-base pr-10 ${errors.confirmPassword ? 'border-destructive' : ''}`}
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
                        <p className="text-xs sm:text-sm text-destructive">{errors.confirmPassword.message}</p>
                      )}
                    </div>

                    {/* Submit button */}
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary text-white font-semibold py-2 sm:py-3 text-base sm:text-lg shadow-lg transform transition-all duration-200 hover:scale-105 disabled:transform-none h-10 sm:h-12" 
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
