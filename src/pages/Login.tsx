
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ModernButton } from '@/components/ui/modern-button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Sparkles } from 'lucide-react';
import AuthMethodToggle from '@/components/auth/AuthMethodToggle';
import PhoneLogin from '@/components/auth/PhoneLogin';
import AnimatedBackground from '@/components/ui/animated-background';

const loginSchema = z.object({
  email: z.string().email({ message: 'אימייל לא תקין' }),
  password: z.string().min(6, { message: 'סיסמה חייבת להיות לפחות 6 תווים' }),
});

const Login = () => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>(() => {
    // Check if returning from phone login redirect
    const phoneLoginInProgress = sessionStorage.getItem('phoneLoginInProgress');
    if (phoneLoginInProgress) {
      // Clean up and redirect to dashboard
      sessionStorage.removeItem('phoneLoginInProgress');
      sessionStorage.removeItem('phoneLogin_showOtp');
      sessionStorage.removeItem('phoneLogin_userInfo');
      sessionStorage.removeItem('phoneLogin_phoneNumber');
      sessionStorage.removeItem('login_authMethod');
      setTimeout(() => {
        navigate('/dashboard');
      }, 100);
      return 'email'; // Default while redirecting
    }
    
    return (sessionStorage.getItem('login_authMethod') as 'email' | 'phone') || 'email';
  });
  
  // Add logging to track auth method changes
  const handleAuthMethodChange = (method: 'email' | 'phone') => {
    console.log('Auth method changing from', authMethod, 'to', method);
    sessionStorage.setItem('login_authMethod', method);
    setAuthMethod(method);
  };
  
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  
  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    try {
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleBackToEmailLogin = () => {
    console.log('Back to email login called');
    sessionStorage.setItem('login_authMethod', 'email');
    // Clear all phone login state when going back
    sessionStorage.removeItem('phoneLogin_showOtp');
    sessionStorage.removeItem('phoneLogin_userInfo');
    sessionStorage.removeItem('phoneLogin_phoneNumber');
    sessionStorage.removeItem('phoneLoginInProgress');
    setAuthMethod('email');
  };

  if (authMethod === 'phone') {
    return (
      <>
        <AnimatedBackground />
        <div className="container mx-auto py-10 px-4 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="w-full max-w-6xl">
            <div className="grid lg:grid-cols-3 gap-8 items-center" dir="ltr">
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

              {/* Phone Login Card - Center */}
              <div className="w-full max-w-md mx-auto lg:mx-0" dir="rtl">
                <PhoneLogin onBack={handleBackToEmailLogin} />
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
  }
  
  return (
    <>
      <AnimatedBackground />
      <div className="container mx-auto py-10 px-4 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="w-full max-w-6xl">
          <div className="grid lg:grid-cols-3 gap-8 items-center" dir="ltr">
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

            {/* Login Card - Center */}
            <div className="w-full max-w-md mx-auto lg:mx-0" dir="rtl">
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
                    <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                      ברוכים הבאים
                    </CardTitle>
                  </div>
                  <CardDescription>
                    בחר את שיטת ההתחברות המועדפת עליך
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Auth Method Toggle */}
                  <AuthMethodToggle 
                    method={authMethod} 
                    onChange={handleAuthMethodChange}
                    disabled={isLoading}
                  />

                  {/* Email Login Form */}
                  <div className="space-y-4">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">כתובת אימייל</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                  <Input 
                                    placeholder="your@email.com" 
                                    {...field} 
                                    className="pl-10 transition-all duration-200 focus:shadow-glow"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">סיסמה</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <Lock className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                  <Input 
                                    type="password" 
                                    placeholder="******" 
                                    {...field} 
                                    className="pl-10 transition-all duration-200 focus:shadow-glow"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="text-right">
                          <Link to="/forgot-password" className="text-sm text-primary hover:text-primary-glow transition-colors duration-200 hover:underline">
                            שכחת סיסמה?
                          </Link>
                        </div>
                        
                        <ModernButton 
                          type="submit" 
                          className="w-full mt-2" 
                          size="lg"
                          loading={isLoading}
                          variant="gradient"
                        >
                          {isLoading ? 'מתחבר...' : 'התחבר'}
                        </ModernButton>
                      </form>
                    </Form>
                  </div>
                </CardContent>
                
                <CardFooter className="flex justify-center">
                  <p className="text-sm text-muted-foreground">
                    עדיין אין לך חשבון?{' '}
                    <Link to="/register" className="text-primary hover:text-primary-glow transition-colors duration-200 hover:underline font-medium">
                      הירשם כאן
                    </Link>
                  </p>
                </CardFooter>
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

export default Login;
