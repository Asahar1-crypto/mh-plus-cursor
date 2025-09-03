import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ModernInput } from '@/components/ui/modern-input';
import { ModernButton } from '@/components/ui/modern-button';
import { SmartPhoneInput } from '@/components/ui/smart-phone-input';
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
  phoneNumber: z.string().min(10, { message: 'מספר טלפון חייב להיות לפחות 10 ספרות' }),
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
      <div className="container mx-auto py-10 px-4 flex items-center justify-center min-h-[calc(100vh-4rem)] relative z-10">
        <div className="w-full max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            
            {/* Characters Section */}
            <div className="hidden lg:flex flex-col items-center justify-center space-y-6 animate-fade-in">
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                  הצטרפו אלינו!
                </h2>
                <p className="text-muted-foreground text-lg">
                  הדמויות שלנו מזמינות אתכם לחוויה מדהימה
                </p>
              </div>
              
              {/* Characters Grid with Welcome Animation */}
              <div className="grid grid-cols-2 gap-6">
                <div className="transform hover:scale-110 transition-transform duration-300 animate-float">
                  <img 
                    src="/lovable-uploads/d057c03d-4b71-4bd3-ba3f-3147d8264aad.png" 
                    alt="דמות ארנק כחולה מברכת" 
                    className="w-28 h-28 object-contain drop-shadow-lg"
                  />
                </div>
                <div className="transform hover:scale-110 transition-transform duration-300 animate-float [animation-delay:0.5s]">
                  <img 
                    src="/lovable-uploads/e113ea52-afd4-427a-9ec3-43f37b2bd9bd.png" 
                    alt="דמות ארנק כתומה מברכת" 
                    className="w-28 h-28 object-contain drop-shadow-lg"
                  />
                </div>
                <div className="transform hover:scale-110 transition-transform duration-300 animate-float [animation-delay:1s]">
                  <img 
                    src="/lovable-uploads/5edd5073-e61d-4828-9c97-f98cc38da82a.png" 
                    alt="דמות ארנק ירוקה מברכת" 
                    className="w-28 h-28 object-contain drop-shadow-lg"
                  />
                </div>
                <div className="transform hover:scale-110 transition-transform duration-300 animate-float [animation-delay:1.5s]">
                  <img 
                    src="/lovable-uploads/85acae0d-85a4-4a69-aef0-af3cb3af2efb.png" 
                    alt="דמות ארנק אדומה מברכת" 
                    className="w-28 h-28 object-contain drop-shadow-lg"
                  />
                </div>
              </div>
              
              <div className="text-center text-sm text-muted-foreground max-w-xs">
                הצוות שלנו כאן כדי לעזור לכם לנהל את התקציב המשפחתי בקלות
              </div>
            </div>

            {/* Registration Form */}
            <div className="w-full max-w-md mx-auto">
              <Card className="glass border-glass-border shadow-card animate-fade-in backdrop-blur-lg">
                <CardHeader className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 mb-4 lg:hidden">
                    <img 
                      src="/lovable-uploads/e113ea52-afd4-427a-9ec3-43f37b2bd9bd.png" 
                      alt="דמות ארנק מברכת" 
                      className="w-12 h-12 object-contain animate-bounce"
                    />
                  </div>
                  <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                    הרשמה למערכת
                  </CardTitle>
                  <CardDescription className="text-base">
                    צור חשבון חדש במערכת מחציות פלוס
                    {emailFromInvitation && (
                      <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                        <div className="text-sm text-blue-800 font-medium">
                          הרשמה עם האימייל: {emailFromInvitation}
                        </div>
                        {invitationId && (
                          <div className="mt-2 text-xs text-green-700 bg-green-50 p-2 rounded-lg">
                            תחובר אוטומטית לחשבון המשותף אחרי אימות האימייל ומספר הטלפון
                          </div>
                        )}
                      </div>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    
                    <SmartPhoneInput
                      label="מספר טלפון"
                      value={form.watch('phoneNumber')}
                      onChange={(value) => form.setValue('phoneNumber', value)}
                      validation={form.formState.errors.phoneNumber ? 'invalid' : form.watch('phoneNumber') && form.watch('phoneNumber').length >= 10 ? 'valid' : 'none'}
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
                      className="w-full mt-8" 
                      size="lg"
                      loading={isLoading}
                      variant="gradient"
                    >
                      {isLoading ? 'מתקדם לאימות SMS...' : 'המשך לאימות SMS'}
                    </ModernButton>
                  </form>
                </CardContent>
                <CardFooter className="flex justify-center pt-6">
                  <p className="text-sm text-muted-foreground">
                    כבר יש לך חשבון?{' '}
                    <Link to="/login" className="text-primary hover:text-primary-glow transition-colors duration-300 font-medium">
                      התחבר כאן
                    </Link>
                  </p>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Register;