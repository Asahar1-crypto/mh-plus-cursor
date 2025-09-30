import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Mail, CheckCircle2 } from 'lucide-react';
import { OnboardingStepProps } from '../types';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const InviteUserStep: React.FC<OnboardingStepProps> = ({ onNext, onBack, onSkip }) => {
  const { account } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInvited, setIsInvited] = useState(false);

  const handleInvite = async () => {
    if (!account) {
      toast.error('לא נמצא חשבון פעיל');
      return;
    }

    if (!email.trim()) {
      toast.error('יש להזין כתובת מייל');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('כתובת מייל לא תקינה');
      return;
    }

    setIsLoading(true);
    try {
      const invitationId = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      const { error } = await supabase
        .from('invitations')
        .insert({
          account_id: account.id,
          email: email.trim().toLowerCase(),
          invitation_id: invitationId,
          expires_at: expiresAt.toISOString(),
        });

      if (error) {
        if (error.message.includes('duplicate')) {
          toast.error('כבר נשלחה הזמנה לכתובת מייל זו');
        } else {
          throw error;
        }
        return;
      }

      setIsInvited(true);
      toast.success('ההזמנה נשלחה בהצלחה!');
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

          {/* Email Input */}
          <div className="space-y-2 animate-in slide-in-from-bottom duration-500 delay-300">
            <Label htmlFor="invite-email">כתובת מייל</Label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="invite-email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pr-10 transition-all duration-300 focus:scale-[1.02]"
                dir="ltr"
              />
            </div>
          </div>

          {/* Send Invitation Button */}
          <Button
            onClick={handleInvite}
            disabled={isLoading || !email.trim()}
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 hover:scale-105"
          >
            {isLoading ? 'שולח הזמנה...' : 'שלח הזמנה'}
          </Button>
        </>
      ) : (
        <Alert className="animate-in zoom-in duration-500 border-primary/50 bg-primary/5">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <AlertDescription className="text-base">
            ההזמנה נשלחה בהצלחה! המשתמש יקבל מייל עם קישור להצטרפות לחשבון.
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
