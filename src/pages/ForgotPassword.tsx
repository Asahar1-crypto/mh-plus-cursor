
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth';
import { Link, useNavigate } from 'react-router-dom';

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'אימייל לא תקין' }),
});

const ForgotPassword = () => {
  const { resetPassword, isLoading } = useAuth();
  const navigate = useNavigate();
  
  console.log('🔧 ForgotPassword component rendered. resetPassword:', !!resetPassword, 'isLoading:', isLoading);
  console.log('🔧 Current URL path:', window.location.pathname);
  console.log('🔧 Browser location:', window.location.href);
  
  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });
  
  const onSubmit = async (data: z.infer<typeof forgotPasswordSchema>) => {
    console.log('🎯 ForgotPassword form submitted with data:', data);
    console.log('🎯 resetPassword function:', resetPassword);
    try {
      console.log('🎯 About to call resetPassword...');
      await resetPassword(data.email);
      console.log('🎯 resetPassword completed successfully');
      // Navigate to a confirmation page or show a success message
      navigate('/login');
    } catch (error) {
      console.error('Password reset error:', error);
    }
  };
  
  return (
    <div className="container mx-auto py-10 px-4 flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-md">
        <Card className="border-border shadow-lg animate-fade-in">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">שחזור סיסמה</CardTitle>
            <CardDescription>
              הזן את כתובת האימייל שלך ואנו נשלח לך קישור לאיפוס הסיסמה
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>אימייל</FormLabel>
                      <FormControl>
                        <Input placeholder="your@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                      שולח...
                    </span>
                  ) : (
                    'שלח קישור לאיפוס'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              <Link to="/login" className="text-brand-600 hover:underline">
                חזרה למסך התחברות
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
