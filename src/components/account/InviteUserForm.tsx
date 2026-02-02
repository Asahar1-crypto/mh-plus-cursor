import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Loader2, AlertCircle, Smartphone } from 'lucide-react';
import { Account } from '@/contexts/auth/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InternationalPhoneInput } from '@/components/ui/international-phone-input';
import { normalizePhoneNumber } from '@/utils/phoneUtils';
import { CountryCode } from 'libphonenumber-js';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

const inviteSchema = z.object({
  phoneNumber: z.string().min(10, { message: 'מספר טלפון לא תקין' }),
});

interface InviteUserFormProps {
  account: Account | null;
  onInvite: (phoneNumber: string) => Promise<void>;
}

const InviteUserForm: React.FC<InviteUserFormProps> = ({ account, onInvite }) => {
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('IL');
  const [phoneValidation, setPhoneValidation] = useState<'none' | 'valid' | 'invalid'>('none');
  
  const inviteForm = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      phoneNumber: '',
    },
  });

  const handlePhoneChange = (value: string) => {
    inviteForm.setValue('phoneNumber', value);
    setError(null);
    
    // Validate phone on change
    if (value.length >= 10) {
      const result = normalizePhoneNumber(value, selectedCountry);
      setPhoneValidation(result.success ? 'valid' : 'invalid');
    } else {
      setPhoneValidation('none');
    }
  };

  const handleCountryChange = (country: CountryCode) => {
    setSelectedCountry(country);
    setPhoneValidation('none');
  };
  
  const onSubmitInvite = async (data: z.infer<typeof inviteSchema>) => {
    if (isInviting) return;
    
    // Validate phone number
    const validationResult = normalizePhoneNumber(data.phoneNumber, selectedCountry);
    if (!validationResult.success) {
      setError(validationResult.error || 'מספר טלפון לא תקין');
      setPhoneValidation('invalid');
      return;
    }
    
    setIsInviting(true);
    setError(null);
    
    try {
      console.log('Starting invitation process for phone:', validationResult.data?.e164);
      console.log('Current account:', account);
      
      if (!account) {
        setError('אין חשבון פעיל. אנא רענן את הדף ונסה שוב.');
        return;
      }
      
      await onInvite(validationResult.data!.e164);
      console.log('Invitation sent successfully');
      
      // Celebration confetti
      const duration = 2000;
      const animationEnd = Date.now() + duration;
      const colors = ['#8B5CF6', '#EC4899', '#3B82F6'];

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: colors,
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: colors,
        });
      }, 60);

      toast.success('🎉 ההזמנה נשלחה בהצלחה ב-SMS!');
      inviteForm.reset();
      setPhoneValidation('none');
    } catch (error: any) {
      console.error('Failed to send invitation:', error);
      
      // Set more specific error messages
      if (error.message?.includes('User or account not found')) {
        setError('שגיאה: המשתמש או החשבון לא נמצאו. אנא רענן את הדף ונסה שוב.');
      } else if (error.message?.includes('already exists')) {
        setError('הזמנה כבר נשלחה למספר טלפון זה.');
      } else {
        setError(error.message || 'שגיאה בשליחת ההזמנה. אנא נסה שוב.');
      }
    } finally {
      setIsInviting(false);
    }
  };

  // Show message if no account is available
  if (!account) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>הזמנת משתמש לחשבון</CardTitle>
          <CardDescription>הזמן משתמש נוסף לצפייה וניהול החשבון</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              אין חשבון פעיל זמין. אנא רענן את הדף או צור קשר עם התמיכה.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Don't display the form if the user doesn't have admin role
  if (account.userRole !== 'admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>הזמנת משתמש לחשבון</CardTitle>
          <CardDescription>הזמן משתמש נוסף לצפייה וניהול החשבון</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              רק מנהלי החשבון יכולים לשלוח הזמנות למשתמשים חדשים.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          הזמנת משתמש לחשבון
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          הזמן משתמש נוסף באמצעות SMS לצפייה וניהול החשבון
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <Form {...inviteForm}>
          <form onSubmit={inviteForm.handleSubmit(onSubmitInvite)} className="space-y-3 sm:space-y-4">
            {error && (
              <Alert variant="destructive" className="mb-3 sm:mb-4">
                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                <AlertDescription className="text-xs sm:text-sm">{error}</AlertDescription>
              </Alert>
            )}
            
            <FormField
              control={inviteForm.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">מספר טלפון</FormLabel>
                  <FormControl>
                    <InternationalPhoneInput
                      label=""
                      value={field.value}
                      onChange={handlePhoneChange}
                      onCountryChange={handleCountryChange}
                      defaultCountry={selectedCountry}
                      validation={phoneValidation}
                      validationMessage={phoneValidation === 'invalid' ? 'מספר טלפון לא תקין' : undefined}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full h-9 sm:h-10 text-xs sm:text-sm" 
              disabled={isInviting}
            >
              {isInviting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                  שולח הזמנה...
                </span>
              ) : (
                <>
                  <UserPlus className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                  שלח הזמנה ב-SMS
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default InviteUserForm;
