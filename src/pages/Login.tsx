
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

  
  return (
    <>
      <AnimatedBackground />
      <div className="container mx-auto py-8 px-4 flex items-center justify-center min-h-[calc(100vh-4rem)]">
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

            {/* Login Card - Center (3 columns) */}
            <div className="w-full max-w-xl mx-auto lg:mx-0 lg:col-span-3" dir="rtl">
              <Card className="border-border shadow-xl animate-fade-in glass shadow-card p-2">{/* Added p-2 for internal padding and shadow-xl for larger shadow */}
                <CardHeader className="text-center pb-8 pt-8">{/* Increased padding */}
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
                <CardContent className="space-y-8 px-8 pb-8">{/* Increased spacing and padding */}
                  {/* Auth Method Toggle */}
                  <AuthMethodToggle 
                    method={authMethod} 
                    onChange={handleAuthMethodChange}
                    disabled={isLoading}
                  />

                  {/* Dynamic Content Based on Auth Method */}
                  {authMethod === 'email' ? (
                    <div className="space-y-6">{/* Increased from space-y-4 */}
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">{/* Increased from space-y-4 */}
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem className="space-y-3">
                                <FormLabel className="text-base font-medium">כתובת אימייל</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                      <Mail className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <Input 
                                      placeholder="your@email.com" 
                                      {...field} 
                                      className="pl-10 h-12 text-base transition-all duration-200 focus:shadow-glow"
                                    />{/* Increased height to h-12 and font size */}
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
                              <FormItem className="space-y-3">
                                <FormLabel className="text-base font-medium">סיסמה</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                      <Lock className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <Input 
                                      type="password" 
                                      placeholder="******" 
                                      {...field} 
                                      className="pl-10 h-12 text-base transition-all duration-200 focus:shadow-glow"
                                    />{/* Increased height to h-12 and font size */}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="text-right pt-2">
                            <Link to="/forgot-password" className="text-base text-primary hover:text-primary-glow transition-colors duration-200 hover:underline">
                              שכחת סיסמה?
                            </Link>
                          </div>
                          
                          <ModernButton 
                            type="submit" 
                            className="w-full mt-4 h-12" 
                            size="lg"
                            loading={isLoading}
                            variant="gradient"
                          >
                            {isLoading ? 'מתחבר...' : 'התחבר'}
                          </ModernButton>{/* Added h-12 for taller button */}
                        </form>
                      </Form>
                    </div>
                  ) : (
                    <div className="space-y-6">{/* Increased from space-y-4 */}
                      <PhoneLogin onBack={handleBackToEmailLogin} hideHeader={true} />
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="flex justify-center pt-8 pb-8 px-8">{/* Increased padding */}
                  <p className="text-base text-muted-foreground">{/* Increased font size */}
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
