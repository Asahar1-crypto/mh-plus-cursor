import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ModernInput } from '@/components/ui/modern-input';
import { ModernButton } from '@/components/ui/modern-button';
import { InternationalPhoneInput } from '@/components/ui/international-phone-input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SmsVerification from '@/components/auth/SmsVerification';
import PhoneExistsAlert from '@/components/auth/PhoneExistsAlert';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, ShieldCheck } from 'lucide-react';

const registerSchema = z.object({
  name: z.string().min(2, { message: 'שם חייב להיות לפחות 2 תווים' }),
  familyRole: z.enum(['father', 'mother', 'other'], { required_error: 'יש לבחור תפקיד' }),
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
  const [showPhoneExists, setShowPhoneExists] = useState(false);
  const [existingUserName, setExistingUserName] = useState<string | undefined>();
  const [registrationData, setRegistrationData] = useState<z.infer<typeof registerSchema> | null>(null);
  
  
  useEffect(() => {
    // Check if there's an invitationId in the URL
    const urlInvitationId = searchParams.get('invitationId');
    const email = searchParams.get('email');
    
    if (email) {
      setEmailFromInvitation(email);
    }
    
    if (urlInvitationId) {
      setInvitationId(urlInvitationId);
    }
  }, [searchParams]);
  
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      familyRole: undefined,
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
      // Pre-check if phone exists before proceeding to SMS
      const { data: checkData, error: checkError } = await supabase.functions.invoke('send-sms', {
        body: {
          phoneNumber: data.phoneNumber,
          type: 'verification',
          verificationType: 'registration'
        }
      });

      // Check for phone exists error - Supabase Functions returns non-2xx in error
      if (checkError) {
        // For FunctionsHttpError, we need to check the context for the response body
        // The error.context contains the Response object
        if (checkError.name === 'FunctionsHttpError' && checkError.context) {
          try {
            // Try to get the response body from the context
            const errorResponse = checkError.context;
            if (errorResponse && typeof errorResponse.json === 'function') {
              const errorBody = await errorResponse.json();
              
              if (errorBody?.error === 'PHONE_EXISTS') {
                setExistingUserName(errorBody.existingUserName);
                setRegistrationData(data);
                setShowPhoneExists(true);
                return;
              }
            }
          } catch (parseError) {
            // Error handled silently
          }
        }
        
        toast.error('שגיאה בשליחת קוד האימות');
        return;
      }

      // If we got a PHONE_EXISTS response in data (shouldn't happen but check anyway)
      if (checkData?.error === 'PHONE_EXISTS') {
        setExistingUserName(checkData.existingUserName);
        setRegistrationData(data);
        setShowPhoneExists(true);
        return;
      }

      // Store registration data for later use
      setRegistrationData(data);
      
      // Show SMS verification step (SMS was already sent in the check above)
      setShowSmsVerification(true);
    } catch (error: any) {
      console.error('Registration pre-check error:', error);
      toast.error('שגיאה בתהליך ההרשמה');
    }
  };

  const handleSmsVerificationComplete = async (verified: boolean) => {
    if (!verified || !registrationData) {
      return;
    }

    try {
      // Store phone number for profile update after registration
      localStorage.setItem('pendingPhoneVerification', JSON.stringify({
        phoneNumber: registrationData.phoneNumber,
        verified: true
      }));
      
      // If we have an invitationId, store it along with the email for auto-linking
      if (invitationId) {
        const pendingInvitations = {
          email: registrationData.email,
          invitations: [{ 
            invitationId,
            accountId: "",
            accountName: "חשבון משותף",
            ownerId: ""
          }],
          skipOnboarding: true // דילוג על Onboarding למוזמנים
        };
        
        localStorage.setItem('pendingInvitationsAfterRegistration', JSON.stringify(pendingInvitations));
      }
      
      // Complete registration - SMS verified, no email verification needed
      const user = await register(registrationData.name, registrationData.email, registrationData.password, registrationData.phoneNumber);

      // Save family role to profile
      if (user?.id && registrationData.familyRole) {
        try {
          await supabase
            .from('profiles')
            .update({ family_role: registrationData.familyRole })
            .eq('id', user.id);
        } catch (roleError) {
          console.error('Error saving family role:', roleError);
          // Non-critical - don't block registration
        }
      }
      
      // Auto-login after successful registration
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: registrationData.email,
        password: registrationData.password
      });
      
      if (loginError) {
        console.error('Auto-login failed:', loginError);
        toast.error('הרישום הצליח אך ההתחברות נכשלה - נסה להתחבר ידנית');
        navigate('/login');
        return;
      }
      
      // Navigate directly to dashboard - user is now logged in
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      // Show error but don't navigate away - let user retry
      toast.error(`שגיאה ברישום: ${error.message || 'נסה שוב'}`);
    }
  };

  const handleBackToForm = () => {
    setShowSmsVerification(false);
    setShowPhoneExists(false);
    setRegistrationData(null);
    setExistingUserName(undefined);
  };

  // Show phone exists alert
  if (showPhoneExists && registrationData) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-primary/20 to-primary-glow/20 rounded-full blur-[100px] animate-float" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-r from-secondary/15 to-primary/15 rounded-full blur-[80px] animate-pulse-slow" />
        </div>
        <div className="container mx-auto py-6 sm:py-10 px-4 flex items-center justify-center min-h-screen">
          <div className="w-full max-w-md" dir="rtl">
            <PhoneExistsAlert
              phoneNumber={registrationData.phoneNumber}
              userName={existingUserName}
              onBack={handleBackToForm}
            />
          </div>
        </div>
      </div>
    );
  }
  
  // Show SMS verification
  if (showSmsVerification && registrationData) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-primary/20 to-primary-glow/20 rounded-full blur-[100px] animate-float" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-r from-secondary/15 to-primary/15 rounded-full blur-[80px] animate-pulse-slow" />
        </div>
        <div className="container mx-auto py-6 sm:py-10 px-4 flex items-center justify-center min-h-screen">
          <div className="w-full max-w-md" dir="rtl">
            <SmsVerification
              phoneNumber={registrationData.phoneNumber}
              onVerificationComplete={handleSmsVerificationComplete}
              onBack={handleBackToForm}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Enhanced Animated Background - identical to Login */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-primary/20 to-primary-glow/20 rounded-full blur-[100px] animate-float" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-r from-secondary/15 to-primary/15 rounded-full blur-[80px] animate-pulse-slow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/5 to-transparent rounded-full" />
        
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
        
        <div className="absolute top-20 right-20 w-2 h-2 bg-primary/30 rounded-full animate-float" style={{ animationDelay: '0s' }} />
        <div className="absolute top-40 left-32 w-1.5 h-1.5 bg-primary-glow/40 rounded-full animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-32 right-40 w-3 h-3 bg-secondary/20 rounded-full animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-20 left-20 w-1.5 h-1.5 bg-primary/30 rounded-full animate-pulse-slow" style={{ animationDelay: '0.5s' }} />
      </div>

      <div className="container mx-auto py-6 sm:py-10 px-4 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md" dir="rtl">
          {/* Main Registration Card - identical style to Login */}
          <Card className="relative border-0 shadow-2xl bg-card/85 backdrop-blur-xl overflow-hidden animate-scale-in">
            {/* Decorative top gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-primary-glow to-secondary" />
            
            {/* Glowing border effect */}
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/10 via-transparent to-primary-glow/10 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <CardHeader className="text-center pt-8 pb-2 px-6 sm:px-8">
              {/* Compact wallet mascots with glow - identical to Login */}
              <div className="flex justify-center gap-3 mb-4">
                <div className="relative group">
                  <div className="absolute inset-0 bg-primary/15 rounded-full blur-lg group-hover:blur-xl transition-all duration-300" />
                  <img 
                    src="/lovable-uploads/3a973532-2477-462a-9a84-0390b7045844.png" 
                    alt="Red Wallet Character" 
                    className="relative w-20 h-20 sm:w-24 sm:h-24 object-contain animate-float hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <div className="relative group">
                  <div className="absolute inset-0 bg-secondary/15 rounded-full blur-lg group-hover:blur-xl transition-all duration-300" />
                  <img 
                    src="/lovable-uploads/3d7094a5-211e-416b-a8c4-8fd864c98499.png" 
                    alt="Green Wallet Character" 
                    className="relative w-20 h-20 sm:w-24 sm:h-24 object-contain animate-float [animation-delay:1s] hover:scale-110 transition-transform duration-300"
                  />
                </div>
              </div>
              
              {/* Title */}
              <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary via-primary-glow to-secondary bg-clip-text text-transparent mb-2">
                יצירת חשבון חדש
              </CardTitle>
              <CardDescription className="text-sm sm:text-base text-muted-foreground">
                הירשם כדי להתחיל לנהל את ההוצאות המשפחתיות
                {emailFromInvitation && (
                  <div className="mt-3 p-2.5 bg-primary/5 rounded-xl border border-primary/20">
                    <div className="text-xs sm:text-sm text-primary font-medium">
                      הוזמנת דרך: {emailFromInvitation}
                    </div>
                    {invitationId && (
                      <div className="mt-1 text-[10px] sm:text-xs text-green-600 dark:text-green-400">
                        חיבור אוטומטי אחרי אימות
                      </div>
                    )}
                  </div>
                )}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 px-6 sm:px-8 pb-6 pt-4">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <ModernInput
                  label="שם מלא"
                  icon="user"
                  placeholder="ישראל ישראלי"
                  value={form.watch('name')}
                  onChange={(e) => form.setValue('name', e.target.value)}
                  validation={form.formState.errors.name ? 'invalid' : form.watch('name') && form.watch('name').length >= 2 ? 'valid' : 'none'}
                  validationMessage={form.formState.errors.name?.message}
                />

                {/* Family role selector */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">אני...</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: 'father' as const, label: 'אבא', image: '/avatars/roles/father.png' },
                      { value: 'mother' as const, label: 'אמא', image: '/avatars/roles/mother.png' },
                      { value: 'other' as const, label: 'אחר', emoji: '👤' },
                    ] as const).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => form.setValue('familyRole', option.value)}
                        className={`flex flex-col items-center gap-1.5 p-2.5 sm:p-3 rounded-xl border-2 transition-all duration-200 text-sm font-medium ${
                          form.watch('familyRole') === option.value
                            ? 'border-primary bg-primary/10 text-primary shadow-sm'
                            : 'border-border/50 bg-background/50 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground'
                        }`}
                      >
                        {'image' in option && option.image ? (
                          <img src={option.image} alt={option.label} className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-full" />
                        ) : (
                          <span className="text-xl sm:text-2xl">{'emoji' in option ? option.emoji : '👤'}</span>
                        )}
                        <span className="text-xs sm:text-sm">{option.label}</span>
                      </button>
                    ))}
                  </div>
                  {form.formState.errors.familyRole && (
                    <p className="text-xs text-destructive">{form.formState.errors.familyRole.message}</p>
                  )}
                </div>
                
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
                  className="w-full h-12 text-base font-semibold rounded-xl shadow-lg hover:shadow-glow transition-all duration-300 mt-2" 
                  size="lg"
                  loading={isLoading}
                  variant="primary"
                >
                  {isLoading ? 'מתקדם לאימות SMS...' : 'המשך לאימות SMS'}
                </ModernButton>
              </form>
            </CardContent>

            {/* Footer with login link */}
            <CardFooter className="flex flex-col items-center gap-4 pb-8 px-6 sm:px-8 border-t border-border/40 pt-6">
              <p className="text-sm sm:text-base text-muted-foreground">
                כבר יש לך חשבון?{' '}
                <Link 
                  to="/login" 
                  className="inline-flex items-center gap-1 text-primary hover:text-primary-glow transition-colors duration-200 font-semibold hover:underline underline-offset-4"
                >
                  התחבר כאן
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </p>
              
              {/* Trust indicator */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>הנתונים שלך מאובטחים ומוצפנים</span>
              </div>
            </CardFooter>
          </Card>
          
          {/* Bottom decorative text */}
          <p className="text-center text-xs text-muted-foreground/50 mt-5 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            ניהול הוצאות משפחתי חכם ופשוט
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
