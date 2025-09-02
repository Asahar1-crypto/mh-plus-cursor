import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Shield, Phone, CheckCircle, AlertCircle } from 'lucide-react';
import { PhoneVerification } from './PhoneVerification';
import { useAuth } from '@/contexts/auth';

export const TwoFactorSetup: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setTwoFactorEnabled(profile.two_factor_enabled || false);
      setPhoneVerified(profile.phone_verified || false);
    }
  }, [profile]);

  const handleTwoFactorToggle = async (enabled: boolean) => {
    if (enabled && !phoneVerified) {
      setShowPhoneVerification(true);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ two_factor_enabled: enabled })
        .eq('id', profile?.id);

      if (error) {
        console.error('Error updating 2FA setting:', error);
        toast.error('שגיאה בעדכון הגדרות האימות הדו-שלבי');
        return;
      }

      setTwoFactorEnabled(enabled);
      await refreshProfile();
      
      toast.success(
        enabled 
          ? 'האימות הדו-שלבי הופעל בהצלחה' 
          : 'האימות הדו-שלבי בוטל'
      );
    } catch (error) {
      console.error('Error:', error);
      toast.error('שגיאה בעדכון הגדרות האימות הדו-שלבי');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneVerificationComplete = async (phoneNumber: string) => {
    setPhoneVerified(true);
    setShowPhoneVerification(false);
    await refreshProfile();
    
    // Now enable 2FA
    await handleTwoFactorToggle(true);
  };

  if (showPhoneVerification) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              הגדרת אימות דו-שלבי
            </CardTitle>
            <CardDescription>
              כדי להפעיל אימות דו-שלבי, קודם צריך לאמת את מספר הטלפון שלך
            </CardDescription>
          </CardHeader>
        </Card>
        
        <PhoneVerification onVerificationComplete={handlePhoneVerificationComplete} />
        
        <Button 
          variant="outline" 
          onClick={() => setShowPhoneVerification(false)}
          className="w-full"
        >
          ביטול
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            אימות דו-שלבי (2FA)
          </CardTitle>
          <CardDescription>
            הוסף שכבת אבטחה נוספת לחשבון שלך באמצעות SMS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Phone Verification Status */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">מספר טלפון</p>
                <p className="text-sm text-muted-foreground">
                  {profile?.phone_number || 'לא הוגדר'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {phoneVerified ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-green-500">מאומת</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  <span className="text-sm text-amber-500">לא מאומת</span>
                </>
              )}
            </div>
          </div>

          {/* 2FA Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <Label htmlFor="2fa-toggle" className="font-medium">
                אימות דו-שלבי
              </Label>
              <p className="text-sm text-muted-foreground">
                קבל קוד אימות בSMS בכל התחברות
              </p>
            </div>
            <Switch
              id="2fa-toggle"
              checked={twoFactorEnabled}
              onCheckedChange={handleTwoFactorToggle}
              disabled={isLoading || (!phoneVerified && !twoFactorEnabled)}
            />
          </div>

          {/* Actions */}
          {!phoneVerified && (
            <Button 
              onClick={() => setShowPhoneVerification(true)}
              className="w-full"
            >
              אמת מספר טלפון
            </Button>
          )}

          {phoneVerified && !twoFactorEnabled && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                מספר הטלפון שלך מאומת. אתה יכול להפעיל עכשיו אימות דו-שלבי.
              </p>
            </div>
          )}

          {twoFactorEnabled && (
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  האימות הדו-שלבי פעיל
                </p>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                מעתה תקבל קוד אימות בSMS בכל התחברות לחשבון.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};