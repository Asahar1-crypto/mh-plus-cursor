import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar } from 'lucide-react';

interface BillingCycleCardProps {
  accountId: string | undefined;
  currentBillingDay: number | null;
  isAdmin: boolean;
}

const BillingCycleCard = ({ accountId, currentBillingDay, isAdmin }: BillingCycleCardProps) => {
  const [billingDay, setBillingDay] = useState<string>((currentBillingDay || 1).toString());
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleUpdate = async () => {
    if (!accountId || !isAdmin) {
      toast({
        title: "שגיאה",
        description: "רק מנהל החשבון יכול לשנות הגדרה זו",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from('accounts')
        .update({ billing_cycle_start_day: parseInt(billingDay) })
        .eq('id', accountId);

      if (error) throw error;

      toast({
        title: "נשמר בהצלחה",
        description: `יום תחילת המחזור החודשי עודכן ל-${billingDay}`,
      });
    } catch (error) {
      console.error('Error updating billing cycle:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לעדכן את יום תחילת המחזור",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Generate options for days 1-31
  const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <CardTitle>מחזור חיוב חודשי</CardTitle>
        </div>
        <CardDescription>
          בחר את היום בחודש שבו ייווצרו ההוצאות החוזרות אוטומטית
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">יום תחילת מחזור חודשי</label>
          <Select
            value={billingDay}
            onValueChange={setBillingDay}
            disabled={!isAdmin || isUpdating}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="בחר יום" />
            </SelectTrigger>
            <SelectContent>
              {dayOptions.map((day) => (
                <SelectItem key={day} value={day.toString()}>
                  {day} לחודש
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            ביום זה בכל חודש ייווצרו ההוצאות החוזרות שהגדרת במערכת
          </p>
        </div>

        {!isAdmin && (
          <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
            רק מנהל החשבון יכול לשנות הגדרה זו
          </p>
        )}

        <Button 
          onClick={handleUpdate} 
          disabled={!isAdmin || isUpdating || billingDay === (currentBillingDay || 1).toString()}
          className="w-full"
        >
          {isUpdating ? 'שומר...' : 'שמור שינויים'}
        </Button>

        <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md text-sm space-y-1">
          <p className="font-medium text-blue-900 dark:text-blue-100">💡 טיפ שימושי</p>
          <p className="text-blue-800 dark:text-blue-200">
            המערכת תיצור אוטומטית את כל ההוצאות החוזרות שהגדרת ביום {billingDay} של כל חודש.
            בחודשים קצרים יותר (כמו פברואר), ההוצאות ייווצרו ביום האחרון של החודש.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default BillingCycleCard;
