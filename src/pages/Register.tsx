
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/contexts/auth';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

const registerSchema = z.object({
  name: z.string().min(2, { message: 'שם חייב להיות לפחות 2 תווים' }),
  email: z.string().email({ message: 'אימייל לא תקין' }),
  password: z.string().min(6, { message: 'סיסמה חייבת להיות לפחות 6 תווים' }),
  confirmPassword: z.string().min(6, { message: 'סיסמה חייבת להיות לפחות 6 תווים' }),
  verificationMethod: z.enum(['email', 'sms'], { message: 'בחר שיטת אימות' }),
  phoneNumber: z.string().min(1, { message: 'מספר טלפון נדרש' }).regex(/^05\d{8}$/, { message: 'פורמט מספר טלפון לא תקין (05xxxxxxxx)' }),
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
      password: '',
      confirmPassword: '',
      verificationMethod: 'sms',
      phoneNumber: '',
    },
  });
  
  const selectedVerificationMethod = form.watch('verificationMethod');
  
  // Update form when emailFromInvitation changes
  useEffect(() => {
    if (emailFromInvitation) {
      form.setValue('email', emailFromInvitation);
    }
  }, [emailFromInvitation, form]);
  
  const onSubmit = async (data: z.infer<typeof registerSchema>) => {
    try {
      console.log("Registering with data:", { ...data, invitationId });
      
      // If we have an invitationId, store it along with the email for auto-linking after verification
      if (invitationId) {
        const pendingInvitations = {
          email: data.email,
          invitations: [{ 
            invitationId,
            // Empty values since we don't have this data yet, will be fetched during auth check
            accountId: "",
            accountName: "חשבון משותף",
            ownerId: ""
          }]
        };
        
        localStorage.setItem('pendingInvitationsAfterRegistration', JSON.stringify(pendingInvitations));
        console.log(`Stored invitation ${invitationId} for email ${data.email} for processing after verification`);
        
        // Verify that data was stored
        setTimeout(() => {
          const storedData = localStorage.getItem('pendingInvitationsAfterRegistration');
          console.log("Verification - stored pendingInvitationsAfterRegistration:", storedData);
        }, 100);
      }
      
      await register(data.name, data.email, data.password, data.verificationMethod, data.phoneNumber);
      
      if (data.verificationMethod === 'sms') {
        navigate('/verify-sms', { 
          state: { 
            email: data.email,
            phoneNumber: data.phoneNumber,
            purpose: 'verification' 
          } 
        });
      } else {
        navigate('/verify-email', { state: { email: data.email } });
      }
    } catch (error) {
      console.error('Registration error:', error);
    }
  };
  
  return (
    <div className="container mx-auto py-10 px-4 flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-2xl">
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
                      תחובר אוטומטית לחשבון המשותף אחרי אימות האימייל
                    </div>
                  )}
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Personal Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground border-b pb-2">פרטים אישיים</h3>
                  
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>שם מלא</FormLabel>
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
                        <FormLabel>כתובת אימייל</FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="your@email.com" 
                            {...field} 
                            disabled={!!emailFromInvitation}
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
                            placeholder="05xxxxxxxx" 
                            {...field}
                            dir="ltr"
                            className="text-left" 
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-sm text-muted-foreground">
                          מספר טלפון ישראלי (נדרש לאימות SMS)
                        </p>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Security Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground border-b pb-2">אבטחה</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>סיסמה</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="לפחות 6 תווים" {...field} />
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
                            <Input type="password" placeholder="חזור על הסיסמה" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Verification Method Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground border-b pb-2">שיטת אימות</h3>
                  
                  <FormField
                    control={form.control}
                    name="verificationMethod"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-base">בחר איך תרצה לאמת את החשבון</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                          >
                            <div className="flex items-center space-x-3 rtl:space-x-reverse p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                              <RadioGroupItem value="sms" id="sms" />
                              <div className="flex-1">
                                <FormLabel htmlFor="sms" className="cursor-pointer font-medium">
                                  SMS
                                </FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  קוד אימות יישלח לטלפון
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3 rtl:space-x-reverse p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                              <RadioGroupItem value="email" id="email" />
                              <div className="flex-1">
                                <FormLabel htmlFor="email" className="cursor-pointer font-medium">
                                  אימייל
                                </FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  לינק אימות יישלח לאימייל
                                </p>
                              </div>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                      יוצר חשבון...
                    </span>
                  ) : (
                    'יצירת חשבון'
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
