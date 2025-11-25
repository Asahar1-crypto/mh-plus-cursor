import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw } from 'lucide-react';

const BackfillRecurringExpenses = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleBackfill = async () => {
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('backfill-recurring-expenses', {
        body: {
          months: ['2025-10', '2025-11']
        }
      });

      if (error) throw error;

      toast({
        title: "הצלחה!",
        description: `נוצרו ${data.totalGenerated} הוצאות חוזרות חסרות`,
      });

      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Error backfilling expenses:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן ליצור את ההוצאות החסרות",
        variant: "destructive",
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
          <CardTitle>תיקון הוצאות חוזרות חסרות</CardTitle>
        </div>
        <CardDescription>
          יצירת הוצאות חוזרות שלא נוצרו אוטומטית עבור אוקטובר ונובמבר 2025
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-md text-sm space-y-2">
          <p className="font-medium text-orange-900 dark:text-orange-100">
            ⚠️ פעולה חד-פעמית
          </p>
          <p className="text-orange-800 dark:text-orange-200">
            פעולה זו תיצור את כל ההוצאות החוזרות החסרות עבור החודשים אוקטובר ונובמבר 2025.
            אין צורך להריץ אותה יותר מפעם אחת.
          </p>
          <p className="text-orange-800 dark:text-orange-200">
            לאחר הפעלה, המערכת תיצור אוטומטית הוצאות חדשות כל חודש ב-1 לחודש.
          </p>
        </div>

        <Button
          onClick={handleBackfill}
          disabled={isProcessing}
          className="w-full"
          variant="default"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              יוצר הוצאות...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              צור הוצאות חוזרות חסרות
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default BackfillRecurringExpenses;
