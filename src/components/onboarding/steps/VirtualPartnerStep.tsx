import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Users, UserRoundX } from 'lucide-react';
import { OnboardingStepProps } from '../types';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type PartnerMode = 'invite' | 'solo';

interface VirtualPartnerStepProps extends OnboardingStepProps {
  onChooseSolo: () => void;
}

export const VirtualPartnerStep: React.FC<VirtualPartnerStepProps> = ({
  onNext,
  onBack,
  onSkip,
  onChooseSolo,
}) => {
  const { account } = useAuth();
  const [mode, setMode] = useState<PartnerMode | null>(null);
  const [partnerName, setPartnerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    if (mode === 'invite') {
      // Go to InviteUserStep
      onNext();
      return;
    }

    if (mode === 'solo') {
      if (!partnerName.trim()) {
        toast.error('יש להזין את שם בן/בת הזוג');
        return;
      }

      if (!account) {
        toast.error('לא נמצא חשבון פעיל');
        return;
      }

      setIsLoading(true);
      try {
        const { error } = await supabase
          .from('accounts')
          .update({ virtual_partner_name: partnerName.trim() })
          .eq('id', account.id);

        if (error) throw error;

        toast.success('שם בן/בת הזוג נשמר בהצלחה');
        // Skip InviteUserStep, go directly to success
        onChooseSolo();
      } catch (error) {
        console.error('Error saving virtual partner name:', error);
        toast.error('שגיאה בשמירת שם בן/בת הזוג');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2 animate-in zoom-in duration-500">
          <Users className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">ניהול משותף</h2>
        <p className="text-muted-foreground">
          האם בן/בת הזוג שלך ישתמש/תשתמש במערכת?
        </p>
      </div>

      {/* Options */}
      <RadioGroup
        value={mode ?? ''}
        onValueChange={(val) => setMode(val as PartnerMode)}
        className="space-y-3 animate-in slide-in-from-bottom duration-500 delay-100"
      >
        <label
          htmlFor="mode-invite"
          className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:border-primary/50 ${
            mode === 'invite'
              ? 'border-primary bg-primary/5'
              : 'border-border'
          }`}
        >
          <RadioGroupItem value="invite" id="mode-invite" />
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">כן — אזמין אותו/ה</p>
              <p className="text-sm text-muted-foreground">
                בן/בת הזוג יקבל/תקבל הזמנה להצטרף למערכת
              </p>
            </div>
          </div>
        </label>

        <label
          htmlFor="mode-solo"
          className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:border-primary/50 ${
            mode === 'solo'
              ? 'border-primary bg-primary/5'
              : 'border-border'
          }`}
        >
          <RadioGroupItem value="solo" id="mode-solo" />
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <UserRoundX className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">לא — אנהל לבד</p>
              <p className="text-sm text-muted-foreground">
                אנהל את כל ההוצאות בעצמי
              </p>
            </div>
          </div>
        </label>
      </RadioGroup>

      {/* Solo mode: partner name input */}
      {mode === 'solo' && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom duration-300">
          <div className="space-y-2">
            <Label htmlFor="partner-name">שם השותף/ה</Label>
            <Input
              id="partner-name"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder="לדוגמה: דני"
              className="text-right"
              dir="rtl"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            תוכל/י לנהל הוצאות ולראות התקזזות גם בלי שהשותף/ה נרשם/ת למערכת. אם יצטרף/תצטרף בעתיד, כל הנתונים יועברו אוטומטית.
          </p>
        </div>
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
        <Button
          onClick={handleContinue}
          disabled={!mode || isLoading || (mode === 'solo' && !partnerName.trim())}
          className="flex-1 bg-gradient-to-r from-primary to-primary/80 transition-all duration-300 hover:scale-105"
        >
          {isLoading ? 'שומר...' : 'המשך'}
        </Button>
      </div>
    </div>
  );
};
