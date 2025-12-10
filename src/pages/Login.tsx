
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
import { Mail, Lock, Sparkles, ArrowLeft } from 'lucide-react';
import AuthMethodToggle from '@/components/auth/AuthMethodToggle';
import PhoneLogin from '@/components/auth/PhoneLogin';

const loginSchema = z.object({
  email: z.string().email({ message: 'אימייל לא תקין' }),
  password: z.string().min(6, { message: 'סיסמה חייבת להיות לפחות 6 תווים' }),
});

const Login = () => {
  console.log('🏠 Login component rendered at:', new Date().toLocaleTimeString());
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
    <div className="relative min-h-screen overflow-hidden">
      {/* Enhanced Animated Background */}
      <div className="fixed inset-0 -z-10">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />
        
        {/* Animated gradient orbs */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-primary/20 to-primary-glow/20 rounded-full blur-[100px] animate-float" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-r from-secondary/15 to-primary/15 rounded-full blur-[80px] animate-pulse-slow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/5 to-transparent rounded-full" />
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
        
        {/* Floating particles */}
        <div className="absolute top-20 right-20 w-3 h-3 bg-primary/40 rounded-full animate-float" style={{ animationDelay: '0s' }} />
        <div className="absolute top-40 left-32 w-2 h-2 bg-primary-glow/50 rounded-full animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-32 right-40 w-4 h-4 bg-secondary/30 rounded-full animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-20 left-20 w-2 h-2 bg-primary/40 rounded-full animate-pulse-slow" style={{ animationDelay: '0.5s' }} />
      </div>

      <div className="container mx-auto py-6 sm:py-10 px-4 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md" dir="rtl">
          {/* Main Login Card */}
          <Card className="relative border-0 shadow-2xl bg-card/80 backdrop-blur-xl overflow-hidden animate-scale-in">
            {/* Decorative top gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary-glow to-secondary" />
            
            {/* Glowing border effect */}
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/20 via-transparent to-primary-glow/20 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <CardHeader className="text-center pt-8 pb-4 px-6 sm:px-8">
              {/* Animated wallet characters */}
              <div className="flex justify-center gap-4 mb-6">
                <div className="relative group">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300" />
                  <img 
                    src="/lovable-uploads/3a973532-2477-462a-9a84-0390b7045844.png" 
                    alt="Red Wallet Character" 
                    className="relative w-28 h-28 sm:w-36 sm:h-36 object-contain animate-bounce [animation-duration:2s] hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <div className="relative group">
                  <div className="absolute inset-0 bg-secondary/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300" />
                  <img 
                    src="/lovable-uploads/3d7094a5-211e-416b-a8c4-8fd864c98499.png" 
                    alt="Green Wallet Character" 
                    className="relative w-28 h-28 sm:w-36 sm:h-36 object-contain animate-bounce [animation-duration:2s] [animation-delay:0.3s] hover:scale-110 transition-transform duration-300"
                  />
                </div>
              </div>
              
              {/* Title with sparkle */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary animate-pulse" />
                <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary via-primary-glow to-secondary bg-clip-text text-transparent">
                  ברוכים הבאים
                </CardTitle>
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary animate-pulse" />
              </div>
              <CardDescription className="text-base sm:text-lg text-muted-foreground">
                בחר את שיטת ההתחברות המועדפת עליך
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6 px-6 sm:px-8 pb-6">
              {/* Auth Method Toggle */}
              <AuthMethodToggle 
                method={authMethod} 
                onChange={handleAuthMethodChange}
                disabled={isLoading}
              />

              {/* Dynamic Content Based on Auth Method */}
              {authMethod === 'email' ? (
                <div className="space-y-5 animate-fade-in">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-sm font-medium text-foreground/80">כתובת אימייל</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none z-10">
                                  <Mail className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                                </div>
                                <Input 
                                  placeholder="your@email.com" 
                                  {...field} 
                                  className="pl-10 h-12 text-base bg-muted/30 border-muted-foreground/20 rounded-xl transition-all duration-300 focus:bg-background focus:shadow-glow focus:border-primary/50 hover:border-primary/30"
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-sm font-medium text-foreground/80">סיסמה</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none z-10">
                                  <Lock className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                                </div>
                                <Input 
                                  type="password" 
                                  placeholder="••••••••" 
                                  {...field} 
                                  className="pl-10 h-12 text-base bg-muted/30 border-muted-foreground/20 rounded-xl transition-all duration-300 focus:bg-background focus:shadow-glow focus:border-primary/50 hover:border-primary/30"
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                      
                      <div className="text-right pt-1">
                        <Link 
                          to="/forgot-password" 
                          className="text-sm text-primary hover:text-primary-glow transition-colors duration-200 hover:underline underline-offset-4"
                        >
                          שכחת סיסמה?
                        </Link>
                      </div>
                      
                      <ModernButton 
                        type="submit" 
                        className="w-full h-12 text-base font-medium rounded-xl shadow-lg hover:shadow-glow transition-all duration-300" 
                        size="lg"
                        loading={isLoading}
                        variant="gradient"
                      >
                        {isLoading ? 'מתחבר...' : 'התחבר'}
                      </ModernButton>
                    </form>
                  </Form>
                </div>
              ) : (
                <div className="space-y-5 animate-fade-in">
                  <PhoneLogin onBack={handleBackToEmailLogin} hideHeader={true} />
                </div>
              )}
            </CardContent>
            
            {/* Footer with register link */}
            <CardFooter className="flex justify-center pb-8 px-6 sm:px-8 border-t border-border/50 pt-6 mt-2">
              <p className="text-base text-muted-foreground">
                עדיין אין לך חשבון?{' '}
                <Link 
                  to="/register" 
                  className="inline-flex items-center gap-1 text-primary hover:text-primary-glow transition-colors duration-200 font-semibold hover:underline underline-offset-4"
                >
                  הירשם כאן
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </p>
            </CardFooter>
          </Card>
          
          {/* Bottom decorative text */}
          <p className="text-center text-sm text-muted-foreground/60 mt-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            ניהול הוצאות משפחתי חכם ופשוט
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
