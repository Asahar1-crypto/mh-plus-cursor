import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw } from 'lucide-react';

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

const BackfillRecurringExpenses = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear  = now.getFullYear();
  const monthLabel   = `${HEBREW_MONTHS[currentMonth - 1]} ${currentYear}`;

  const handleGenerate = async () => {
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.rpc('generate_recurring_expenses', {
        p_month: currentMonth,
        p_year:  currentYear,
      });

      if (error) throw error;

      // rpc returns an array with one row
      const result = Array.isArray(data) ? data[0] : data;
      const generated = result?.generated ?? 0;
      const skipped   = result?.skipped   ?? 0;

      toast({
        title: 'הצלחה!',
        description: generated > 0
          ? `נוצרו ${generated} הוצאות חוזרות עבור ${monthLabel}${skipped > 0 ? ` (${skipped} כבר קיימות)` : ''}`
          : `כל ההוצאות החוזרות עבור ${monthLabel} כבר קיימות (${skipped} דולגו)`,
      });

      if (generated > 0) {
        setTimeout(() => window.location.reload(), 2000);
      }

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Error generating recurring expenses:', message);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן ליצור את ההוצאות החוזרות',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="border-orange-200 dark:border-orange-800">
      <CardHeader>
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-orange-500" />
          <CardTitle>יצירת הוצאות חוזרות לחודש הנוכחי</CardTitle>
        </div>
        <CardDescription>
          הפעל את מנגנון יצירת ההוצאות החוזרות עבור {monthLabel}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-md text-sm space-y-2">
          <p className="font-medium text-orange-900 dark:text-orange-100">
            ℹ️ מידע
          </p>
          <p className="text-orange-800 dark:text-orange-200">
            הכפתור יצור את ההוצאות החוזרות הפעילות עבור {monthLabel}.
            הוצאות שכבר קיימות ידולגו אוטומטית (אין כפילויות).
          </p>
          <p className="text-orange-800 dark:text-orange-200">
            בדרך כלל מנגנון זה רץ אוטומטית ב-1 לכל חודש בשעה 06:00 UTC.
            השתמש בכפתור זה רק אם ההוצאות לא נוצרו אוטומטית.
          </p>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isProcessing}
          className="w-full"
          variant="default"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              יוצר הוצאות עבור {monthLabel}...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              צור הוצאות חוזרות עבור {monthLabel}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default BackfillRecurringExpenses;
