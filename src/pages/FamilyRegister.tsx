import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useInvitationDetails } from '@/hooks/useInvitationDetails';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InternationalPhoneInput } from '@/components/ui/international-phone-input';
import LoadingState from '@/components/invitation/LoadingState';
import ErrorState from '@/components/invitation/ErrorState';
import { Users, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const registerSchema = z.object({
  name: z.string().min(2, 'השם חייב להכיל לפחות 2 תווים'),
  password: z.string().min(6, 'הסיסמה חייבת להכיל לפחות 6 תווים'),
  confirmPassword: z.string(),
  phoneNumber: z.string().min(10, 'מספר טלפון לא תקין'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "הסיסמאות לא תואמות",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const FamilyRegister = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const invitationId = searchParams.get('invitationId');
  const { status, invitationDetails, errorMessage } = useInvitationDetails(invitationId);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema)
  });

  // Auto-fill email from invitation (read-only)
  const email = invitationDetails?.email || '';

  const onSubmit = async (data: RegisterFormData) => {
    if (!invitationId) {
      toast.error('מזהה הזמנה חסר');
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Implement family registration with OTP
      toast.success('רישום התחיל בהצלחה! נשלח קוד אימות ל-' + data.phoneNumber);
      
      // Navigate to new phone-based OTP verification page
      navigate(`/family-register?invitationId=${invitationId}`);
      
    } catch (error: any) {
      console.error('Registration failed:', error);
      toast.error(`שגיאה ברישום: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="container mx-auto py-6 sm:py-10 px-3 sm:px-4 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
        <LoadingState />
      </div>
    );
  }

  if (status === 'error' || !invitationDetails) {
    return (
      <div className="container mx-auto py-6 sm:py-10 px-3 sm:px-4 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
        <ErrorState message={errorMessage || 'ההזמנה לא נמצאה או שפגה תוקפה'} />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 sm:py-10 px-3 sm:px-4 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center px-4 sm:px-6">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
          </div>
          <CardTitle className="text-xl sm:text-2xl">הצטרפות למשפחה</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            הצטרפות לחשבון "{invitationDetails.accountName}"
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name field */}
            <div className="space-y-2">
              <Label htmlFor="name">שם מלא *</Label>
              <Input
                id="name"
                type="text"
                placeholder="הזן את שמך המלא"
                {...register('name')}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Email field (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email">כתובת אימייל</Label>
              <Input
                id="email"
                type="email"
                value={email}
                readOnly
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                כתובת האימייל נקבעת על פי ההזמנה ולא ניתן לשנותה
              </p>
            </div>

            {/* Phone field */}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">מספר טלפון *</Label>
              <InternationalPhoneInput
                label=""
                value={watch('phoneNumber') || ''}
                onChange={(value) => setValue('phoneNumber', value)}
                validation={errors.phoneNumber ? 'invalid' : watch('phoneNumber') && watch('phoneNumber').startsWith('+') && watch('phoneNumber').length >= 10 ? 'valid' : 'none'}
                validationMessage={errors.phoneNumber?.message}
              />
              <p className="text-xs text-muted-foreground">
                נשלח קוד אימות למספר הטלפון לאימות
              </p>
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <Label htmlFor="password">סיסמה *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="הזן סיסמה"
                  {...register('password')}
                  className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">אישור סיסמה *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="הזן שוב את הסיסמה"
                  {...register('confirmPassword')}
                  className={errors.confirmPassword ? 'border-destructive pr-10' : 'pr-10'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Submit button */}
            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'נרשם...' : 'המשך לאימות טלפון'}
            </Button>

            {/* Account info */}
            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                מוזמן על ידי: <span className="font-medium">{invitationDetails.ownerName}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                חשבון: <span className="font-medium">{invitationDetails.accountName}</span>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default FamilyRegister;