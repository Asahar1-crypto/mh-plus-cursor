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
    // Clear phone login state when going back
    sessionStorage.removeItem('phoneLogin_showOtp');
    sessionStorage.removeItem('phoneLogin_userInfo');
    sessionStorage.removeItem('phoneLogin_phoneNumber');
    setAuthMethod('email');
  };

  if (authMethod === 'phone') {
    return (
      <>
        <AnimatedBackground />
        <div className="container mx-auto py-10 px-4 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="w-full max-w-md">
            <PhoneLogin onBack={handleBackToEmailLogin} />
          </div>
        </div>
      </>
    );
  }
  
  return (
    <>
      <AnimatedBackground />
      <div className="container mx-auto py-10 px-4 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="w-full max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            
            {/* Characters Section */}
            <div className="hidden lg:flex flex-col items-center justify-center space-y-6 animate-fade-in">
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                  ברוכים השבים!
                </h2>
                <p className="text-muted-foreground text-lg">
                  הצוות שלנו מחכה לכם
                </p>
              </div>
              
              {/* Characters Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div className="transform hover:scale-110 transition-transform duration-300 animate-float">
                  <img 
                    src="/lovable-uploads/d057c03d-4b71-4bd3-ba3f-3147d8264aad.png" 
                    alt="דמות ארנק כחולה" 
                    className="w-24 h-24 object-contain drop-shadow-lg"
                  />
                </div>
                <div className="transform hover:scale-110 transition-transform duration-300 animate-float [animation-delay:0.5s]">
                  <img 
                    src="/lovable-uploads/e113ea52-afd4-427a-9ec3-43f37b2bd9bd.png" 
                    alt="דמות ארנק כתומה" 
                    className="w-24 h-24 object-contain drop-shadow-lg"
                  />
                </div>
                <div className="transform hover:scale-110 transition-transform duration-300 animate-float [animation-delay:1s]">
                  <img 
                    src="/lovable-uploads/5edd5073-e61d-4828-9c97-f98cc38da82a.png" 
                    alt="דמות ארנק ירוקה" 
                    className="w-24 h-24 object-contain drop-shadow-lg"
                  />
                </div>
                <div className="transform hover:scale-110 transition-transform duration-300 animate-float [animation-delay:1.5s]">
                  <img 
                    src="/lovable-uploads/85acae0d-85a4-4a69-aef0-af3cb3af2efb.png" 
                    alt="דמות ארנק אדומה" 
                    className="w-24 h-24 object-contain drop-shadow-lg"
                  />
                </div>
              </div>
            </div>

            {/* Login Form */}
            <div className="w-full max-w-md mx-auto">
              <Card className="border-border shadow-lg animate-fade-in glass shadow-card">
                <CardHeader className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-4 lg:hidden">
                    <img 
                      src="/lovable-uploads/d057c03d-4b71-4bd3-ba3f-3147d8264aad.png" 
                      alt="דמות ארנק" 
                      className="w-12 h-12 object-contain animate-pulse"
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
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;