
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ModernInput } from '@/components/ui/modern-input';
import { ModernButton } from '@/components/ui/modern-button';
import { InternationalPhoneInput } from '@/components/ui/international-phone-input';
import AnimatedBackground from '@/components/ui/animated-background';
import { useAuth } from '@/contexts/auth';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SmsVerification from '@/components/auth/SmsVerification';
import { useConfetti } from '@/components/ui/confetti';
import { CelebrationModal } from '@/components/ui/celebration-modal';

const registerSchema = z.object({
  name: z.string().min(2, { message: 'שם חייב להיות לפחות 2 תווים' }),
  email: z.string().email({ message: 'אימייל לא תקין' }),
  phoneNumber: z.string().min(8, { message: 'מספר טלפון חייב להיות תקין' }).refine((phone) => {
    // Allow international phone numbers in E.164 format
    return phone.startsWith('+') && phone.length >= 10 && phone.length <= 15;
  }, { message: 'מספר טלפון חייב להיות בפורמט בינלאומי תקין' }),
  password: z.string().min(6, { message: 'סיסמה חייבת להיות לפחות 6 תווים' }),
  confirmPassword: z.string().min(6, { message: 'סיסמה חייבת להיות לפחות 6 תווים' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "הסיסמאות אינן תואמות",
  path: ["confirmPassword"],
});

const Register = () => {
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [emailFromInvitation, setEmailFromInvitation] = useState<string>('');
  const [invitationId, setInvitationId] = useState<string | null>(null);
  const [showSmsVerification, setShowSmsVerification] = useState(false);
  const [registrationData, setRegistrationData] = useState<z.infer<typeof registerSchema> | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const { isActive: confettiActive, fire: fireConfetti, ConfettiComponent } = useConfetti();
  
  useEffect(() => {
    // Check if there's an invitationId in the URL
    const urlInvitationId = searchParams.get('invitationId');
    const email = searchParams.get('email');
    
    console.log("URL params:", { urlInvitationId, email });
    
    if (email) {
      setEmailFromInvitation(email);
    }
    
    if (urlInvitationId) {
      setInvitationId(urlInvitationId);
      console.log(`Detected invitationId ${urlInvitationId} for processing after registration`);
    }
  }, [searchParams]);
  
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: emailFromInvitation || '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
    },
  });
  
  // Update form when emailFromInvitation changes
  useEffect(() => {
    if (emailFromInvitation) {
      form.setValue('email', emailFromInvitation);
    }
  }, [emailFromInvitation, form]);
  
  const onSubmit = async (data: z.infer<typeof registerSchema>) => {
    try {
      console.log("Proceeding to SMS verification with data:", { ...data, invitationId });
      
      // Store registration data for later use
      setRegistrationData(data);
      
      // Show SMS verification step
      setShowSmsVerification(true);
    } catch (error) {
      console.error('Registration error:', error);
    }
  };

  const handleSmsVerificationComplete = async (verified: boolean) => {
    if (!verified || !registrationData) {
      return;
    }

    try {
      // If we have an invitationId, store it along with the email for auto-linking after verification
      if (invitationId) {
        const pendingInvitations = {
          email: registrationData.email,
          invitations: [{ 
            invitationId,
            // Empty values since we don't have this data yet, will be fetched during auth check
            accountId: "",
            accountName: "חשבון משותף",
            ownerId: ""
          }]
        };
        
        localStorage.setItem('pendingInvitationsAfterRegistration', JSON.stringify(pendingInvitations));
        console.log(`Stored invitation ${invitationId} for email ${registrationData.email} for processing after verification`);
      }
      
      // Complete registration with phone verification
      await register(registrationData.name, registrationData.email, registrationData.password);
      navigate('/verify-email', { state: { email: registrationData.email } });
    } catch (error) {
      console.error('Registration error:', error);
    }
  };

  const handleBackToForm = () => {
    setShowSmsVerification(false);
    setRegistrationData(null);
  };
  
  if (showSmsVerification && registrationData) {
    return (
      <div className="container mx-auto py-10 px-4 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="w-full max-w-md">
          <SmsVerification
            phoneNumber={registrationData.phoneNumber}
            onVerificationComplete={handleSmsVerificationComplete}
            onBack={handleBackToForm}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <AnimatedBackground />
      <div className="container mx-auto py-4 sm:py-8 px-3 sm:px-4 flex items-center justify-center min-h-[calc(100vh-4rem)] relative z-10">
        <div className="w-full max-w-6xl">
          <div className="grid lg:grid-cols-3 gap-4 lg:gap-8 items-center" dir="ltr">
            {/* Empty column for centering */}
            <div className="hidden lg:block"></div>

            {/* Registration Card - Center */}
            <div className="w-full" dir="rtl">
          <Card className="border-border shadow-xl animate-fade-in glass shadow-card">
            <CardHeader className="text-center p-4 sm:p-6 lg:p-8">
              {/* Mobile wallet characters */}
              <div className="flex justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <img 
                  src="/lovable-uploads/3a973532-2477-462a-9a84-0390b7045844.png" 
                  alt="Red Wallet Character" 
                  className="w-32 h-32 sm:w-40 sm:h-40 object-contain animate-bounce [animation-duration:2s]"
                />
                <img 
                  src="/lovable-uploads/3d7094a5-211e-416b-a8c4-8fd864c98499.png" 
                  alt="Green Wallet Character" 
                  className="w-32 h-32 sm:w-40 sm:h-40 object-contain animate-bounce [animation-duration:2s] [animation-delay:0.3s]"
                />
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                  הרשמה למערכת
                </CardTitle>
              </div>
              <CardDescription className="text-sm sm:text-base">
                צור חשבון חדש במערכת מחציות פלוס
                {emailFromInvitation && (
                  <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 font-medium">
                      הזמנה: {emailFromInvitation}
                    </div>
                    {invitationId && (
                      <div className="mt-1 text-[10px] sm:text-xs text-green-700 dark:text-green-300">
                        ✓ חיבור אוטומטי אחרי אימות
                      </div>
                    )}
                  </div>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
                <ModernInput
                  label="שם מלא"
                  icon="user"
                  placeholder="ישראל ישראלי"
                  value={form.watch('name')}
                  onChange={(e) => form.setValue('name', e.target.value)}
                  validation={form.formState.errors.name ? 'invalid' : form.watch('name') && form.watch('name').length >= 2 ? 'valid' : 'none'}
                  validationMessage={form.formState.errors.name?.message}
                />
                
                <ModernInput
                  label="כתובת אימייל"
                  icon="email"
                  type="email"
                  placeholder="your@email.com"
                  value={form.watch('email')}
                  onChange={(e) => form.setValue('email', e.target.value)}
                  disabled={!!emailFromInvitation}
                  validation={form.formState.errors.email ? 'invalid' : form.watch('email') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.watch('email')) ? 'valid' : 'none'}
                  validationMessage={form.formState.errors.email?.message}
                />
                
                <InternationalPhoneInput
                  label="מספר טלפון"
                  value={form.watch('phoneNumber')}
                  onChange={(value) => form.setValue('phoneNumber', value)}
                  validation={form.formState.errors.phoneNumber ? 'invalid' : form.watch('phoneNumber') && form.watch('phoneNumber').startsWith('+') && form.watch('phoneNumber').length >= 10 ? 'valid' : 'none'}
                  validationMessage={form.formState.errors.phoneNumber?.message}
                />
                
                <ModernInput
                  label="סיסמה"
                  icon="password"
                  type="password"
                  placeholder="******"
                  value={form.watch('password')}
                  onChange={(e) => form.setValue('password', e.target.value)}
                  validation={form.formState.errors.password ? 'invalid' : form.watch('password') && form.watch('password').length >= 6 ? 'valid' : 'none'}
                  validationMessage={form.formState.errors.password?.message}
                />
                
                <ModernInput
                  label="אימות סיסמה"
                  icon="password"
                  type="password"
                  placeholder="******"
                  value={form.watch('confirmPassword')}
                  onChange={(e) => form.setValue('confirmPassword', e.target.value)}
                  validation={form.formState.errors.confirmPassword ? 'invalid' : form.watch('confirmPassword') && form.watch('password') === form.watch('confirmPassword') ? 'valid' : 'none'}
                  validationMessage={form.formState.errors.confirmPassword?.message}
                />
                
                <ModernButton 
                  type="submit" 
                  className="w-full mt-6 sm:mt-8 h-11 sm:h-12" 
                  size="lg"
                  loading={isLoading}
                  variant="gradient"
                >
                  {isLoading ? 'מתקדם לאימות SMS...' : 'המשך לאימות SMS'}
                </ModernButton>
              </form>
            </CardContent>
            <CardFooter className="flex justify-center p-4 sm:p-6 lg:p-8">
              <p className="text-sm sm:text-base text-muted-foreground">
                כבר יש לך חשבון?{' '}
                <Link to="/login" className="text-primary hover:text-primary-glow transition-colors duration-300 font-medium">
                  התחבר כאן
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>

        {/* Empty column for centering */}
        <div className="hidden lg:block"></div>
      </div>
    </div>
  </div>
    </>
  );
};

export default Register;
