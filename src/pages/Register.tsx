
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SmsVerification from '@/components/auth/SmsVerification';

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
      await register(registrationData.name, registrationData.email, registrationData.password, registrationData.phoneNumber);
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
    <div className="container mx-auto py-10 px-4 flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-md">
        <Card className="border-border shadow-lg animate-fade-in">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">הרשמה</CardTitle>
            <CardDescription>
              צור חשבון חדש במערכת מחציות פלוס
              {emailFromInvitation && (
                <div className="mt-2 text-sm bg-blue-50 p-2 rounded border border-blue-100">
                  הרשמה עם האימייל: {emailFromInvitation}
                  {invitationId && (
                    <div className="mt-1 text-green-700">
                      תחובר אוטומטית לחשבון המשותף אחרי אימות האימייל ומספר הטלפון
                    </div>
                  )}
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>שם</FormLabel>
                      <FormControl>
                        <Input placeholder="ישראל ישראלי" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>אימייל</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="your@email.com" 
                          {...field} 
                          disabled={!!emailFromInvitation} // Disable editing if coming from invitation 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>מספר טלפון</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="050-1234567" 
                          {...field} 
                          onChange={(e) => {
                            // Allow only numbers, spaces, and dashes
                            const value = e.target.value.replace(/[^\d\s-]/g, '');
                            field.onChange(value);
                          }}
                        />
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
                      <FormLabel>סיסמה</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="******" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>אימות סיסמה</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="******" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                      מתקדם לאימות SMS...
                    </span>
                  ) : (
                    'המשך לאימות SMS'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              כבר יש לך חשבון?{' '}
              <Link to="/login" className="text-brand-600 hover:underline">
                התחבר כאן
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Register;
