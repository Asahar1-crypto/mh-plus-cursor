import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { UserPlus, Smartphone, CheckCircle2 } from 'lucide-react';
import { OnboardingStepProps } from '../types';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InternationalPhoneInput } from '@/components/ui/international-phone-input';
import { normalizePhoneNumber } from '@/utils/phoneUtils';
import { CountryCode } from 'libphonenumber-js';

export const InviteUserStep: React.FC<OnboardingStepProps> = ({ onNext, onBack, onSkip }) => {
  const { account, user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInvited, setIsInvited] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('IL');
  const [phoneValidation, setPhoneValidation] = useState<'none' | 'valid' | 'invalid'>('none');

  const handlePhoneChange = (value: string) => {
    setPhoneNumber(value);
    
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

  const handleInvite = async () => {
    if (!account) {
      toast.error('לא נמצא חשבון פעיל');
      return;
    }

    if (!phoneNumber.trim()) {
      toast.error('יש להזין מספר טלפון');
      return;
    }

    // Validate phone number
    const validationResult = normalizePhoneNumber(phoneNumber, selectedCountry);
    if (!validationResult.success) {
      toast.error('מספר טלפון לא תקין');
      setPhoneValidation('invalid');
      return;
    }

    const normalizedPhone = validationResult.data!.e164;

    setIsLoading(true);
    try {
      const invitationId = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      // Create invitation with phone number
      const { error } = await supabase
        .from('invitations')
        .insert({
          account_id: account.id,
          phone_number: normalizedPhone,
          email: null,
          invitation_id: invitationId,
          expires_at: expiresAt.toISOString(),
        });

      if (error) {
        if (error.message.includes('duplicate')) {
          toast.error('כבר נשלחה הזמנה למספר טלפון זה');
        } else {
          throw error;
        }
        return;
      }

      // Send SMS - always use production URL
      const productionUrl = 'https://mhplus.online';
      try {
        await supabase.functions.invoke('send-invitation-sms', {
          body: {
            phoneNumber: normalizedPhone,
            invitationId: invitationId,
            accountName: account.name,
            inviterName: user?.name || user?.email || 'מישהו',
            baseUrl: productionUrl
          }
        });
      } catch (smsError) {
        console.warn('SMS sending failed, invitation still created:', smsError);
      }

      setIsInvited(true);
      toast.success('ההזמנה נשלחה בהצלחה ב-SMS!');
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('שגיאה בשליחת ההזמנה');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2 animate-in zoom-in duration-500">
          <UserPlus className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">הזמנת משתמש נוסף</h2>
        <p className="text-muted-foreground">
          הזמינו את בן/בת הזוג שלכם לניהול משותף של החשבון
        </p>
      </div>

      {!isInvited ? (
        <>
          {/* Info */}
          <div className="space-y-3 animate-in slide-in-from-bottom duration-500 delay-100">
            {[
              { icon: '🤝', text: 'ניהול משותף ושקוף של ההוצאות' },
              { icon: '📱', text: 'גישה מכל מכשיר ובכל זמן' },
              { icon: '🔔', text: 'עדכונים בזמן אמת על הוצאות חדשות' },
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg bg-card border hover:border-primary/50 transition-all duration-300"
                style={{ animationDelay: `${(index + 1) * 100}ms` }}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-sm">{item.text}</span>
              </div>
            ))}
          </div>

          {/* Phone Input */}
          <div className="space-y-2 animate-in slide-in-from-bottom duration-500 delay-300">
            <Label htmlFor="invite-phone" className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              מספר טלפון
            </Label>
            <InternationalPhoneInput
              label=""
              value={phoneNumber}
              onChange={handlePhoneChange}
              onCountryChange={handleCountryChange}
              defaultCountry={selectedCountry}
              validation={phoneValidation}
              validationMessage={phoneValidation === 'invalid' ? 'מספר טלפון לא תקין' : undefined}
            />
          </div>

          {/* Send Invitation Button */}
          <Button
            onClick={handleInvite}
            disabled={isLoading || !phoneNumber.trim()}
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 hover:scale-105"
          >
            {isLoading ? 'שולח הזמנה...' : 'שלח הזמנה ב-SMS'}
          </Button>
        </>
      ) : (
        <Alert className="animate-in zoom-in duration-500 border-primary/50 bg-primary/5">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <AlertDescription className="text-base">
            ההזמנה נשלחה בהצלחה ב-SMS! המשתמש יקבל הודעה עם קישור להצטרפות לחשבון.
          </AlertDescription>
        </Alert>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1 transition-all duration-300 hover:scale-105"
        >
          חזור
        </Button>
        {!isInvited && (
          <Button
            variant="outline"
            onClick={onSkip}
            className="flex-1 transition-all duration-300 hover:scale-105"
          >
            דלג
          </Button>
        )}
        <Button
          onClick={onNext}
          className="flex-1 bg-gradient-to-r from-primary to-primary/80 transition-all duration-300 hover:scale-105"
        >
          {isInvited ? 'סיום' : 'המשך'}
        </Button>
      </div>
    </div>
  );
};
