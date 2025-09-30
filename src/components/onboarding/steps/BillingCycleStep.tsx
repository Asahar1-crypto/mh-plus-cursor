import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Info } from 'lucide-react';
import { OnboardingStepProps, BillingCycleType, BillingCycleData } from '../types';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const BillingCycleStep: React.FC<OnboardingStepProps> = ({ onNext, onBack }) => {
  const { account } = useAuth();
  const [cycleType, setCycleType] = useState<BillingCycleType>('monthly');
  const [startDay, setStartDay] = useState<number>(1);
  const [endDay, setEndDay] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = async () => {
    if (!account) {
      toast.error('לא נמצא חשבון פעיל');
      return;
    }

    if (cycleType === 'custom' && (!startDay || !endDay)) {
      toast.error('יש לבחור תאריכים עבור מחזור מותאם');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('accounts')
        .update({
          billing_cycle_type: cycleType,
          billing_cycle_start_day: startDay,
          billing_cycle_end_day: cycleType === 'monthly' ? null : endDay,
        })
        .eq('id', account.id);

      if (error) throw error;

      toast.success('מחזור החיוב נשמר בהצלחה!');
      onNext();
    } catch (error) {
      console.error('Error saving billing cycle:', error);
      toast.error('שגיאה בשמירת מחזור החיוב');
    } finally {
      setIsLoading(false);
    }
  };

  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2 animate-in zoom-in duration-500">
          <Calendar className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">מחזור חיוב</h2>
        <p className="text-muted-foreground">
          קבעו את תקופת החישוב החודשית שלכם
        </p>
      </div>

      <Alert className="animate-in slide-in-from-top duration-500 delay-100">
        <Info className="h-4 w-4" />
        <AlertDescription>
          מחזור החיוב משפיע על כל החישובים במערכת - הדשבורד, הדוחות וסגירת החודש
        </AlertDescription>
      </Alert>

      {/* Cycle Type Selection */}
      <div className="space-y-4 animate-in slide-in-from-bottom duration-500 delay-200">
        <Label className="text-base font-semibold">בחרו סוג מחזור</Label>
        <RadioGroup value={cycleType} onValueChange={(v) => setCycleType(v as BillingCycleType)}>
          <div className="space-y-3">
            {/* Monthly Option */}
            <div
              className={`flex items-start space-x-reverse space-x-3 p-4 rounded-lg border-2 transition-all duration-300 cursor-pointer hover:scale-[1.02] ${
                cycleType === 'monthly'
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setCycleType('monthly')}
            >
              <RadioGroupItem value="monthly" id="monthly" className="mt-1" />
              <div className="flex-1 space-y-1">
                <Label htmlFor="monthly" className="cursor-pointer font-semibold">
                  מחזור קלנדרי (ברירת מחדל)
                </Label>
                <p className="text-sm text-muted-foreground">
                  מתחילת החודש (1) ועד סוף החודש הקלנדרי
                </p>
              </div>
            </div>

            {/* Custom Option */}
            <div
              className={`flex items-start space-x-reverse space-x-3 p-4 rounded-lg border-2 transition-all duration-300 cursor-pointer hover:scale-[1.02] ${
                cycleType === 'custom'
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setCycleType('custom')}
            >
              <RadioGroupItem value="custom" id="custom" className="mt-1" />
              <div className="flex-1 space-y-1">
                <Label htmlFor="custom" className="cursor-pointer font-semibold">
                  מחזור מותאם אישית
                </Label>
                <p className="text-sm text-muted-foreground">
                  בחרו תאריכי התחלה וסיום ספציפיים
                </p>
              </div>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Custom Date Selection */}
      {cycleType === 'custom' && (
        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-bottom duration-500">
          <div className="space-y-2">
            <Label htmlFor="start-day">יום התחלה</Label>
            <Select value={startDay.toString()} onValueChange={(v) => setStartDay(parseInt(v))}>
              <SelectTrigger id="start-day" className="transition-all duration-300 hover:scale-[1.02]">
                <SelectValue placeholder="בחר יום" />
              </SelectTrigger>
              <SelectContent>
                {days.map((day) => (
                  <SelectItem key={day} value={day.toString()}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="end-day">יום סיום</Label>
            <Select value={endDay?.toString() || ''} onValueChange={(v) => setEndDay(parseInt(v))}>
              <SelectTrigger id="end-day" className="transition-all duration-300 hover:scale-[1.02]">
                <SelectValue placeholder="בחר יום" />
              </SelectTrigger>
              <SelectContent>
                {days.map((day) => (
                  <SelectItem key={day} value={day.toString()}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Example */}
      <div className="p-4 rounded-lg bg-muted/50 animate-in fade-in duration-500 delay-300">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">לדוגמה:</span>{' '}
          {cycleType === 'monthly'
            ? 'החישוב יהיה מה-1 לכל חודש ועד סוף אותו חודש'
            : endDay
            ? `החישוב יהיה מה-${startDay} לכל חודש ועד ה-${endDay} לחודש הבא`
            : 'בחרו תאריכים כדי לראות דוגמה'}
        </p>
      </div>

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
          onClick={handleNext}
          disabled={isLoading || (cycleType === 'custom' && !endDay)}
          className="flex-1 bg-gradient-to-r from-primary to-primary/80 transition-all duration-300 hover:scale-105"
        >
          {isLoading ? 'שומר...' : 'המשך'}
        </Button>
      </div>
    </div>
  );
};
