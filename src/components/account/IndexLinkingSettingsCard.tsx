import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, ExternalLink } from 'lucide-react';

interface IndexLinkingSettingsCardProps {
  accountId: string | undefined;
  currentIndexLinkingEnabled: boolean | null;
  isAdmin: boolean;
}

const CBS_LINK = 'https://www.cbs.gov.il/he/statistics/Pages/2019/מדד-המחירים-לצרכן.aspx';

export const IndexLinkingSettingsCard = ({
  accountId,
  currentIndexLinkingEnabled,
  isAdmin,
}: IndexLinkingSettingsCardProps) => {
  const [enabled, setEnabled] = useState(currentIndexLinkingEnabled ?? false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setEnabled(currentIndexLinkingEnabled ?? false);
  }, [currentIndexLinkingEnabled]);

  const handleToggle = async (checked: boolean) => {
    if (!accountId || !isAdmin) {
      toast({
        title: 'שגיאה',
        description: 'רק מנהל החשבון יכול לשנות הגדרה זו',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('accounts')
        .update({ index_linking_enabled: checked })
        .eq('id', accountId);

      if (error) throw error;

      setEnabled(checked);
      toast({
        title: 'נשמר בהצלחה',
        description: checked
          ? 'הצמדה למדד הופעלה – ניתן להוסיף הוצאות חוזרות צמודות למדד'
          : 'הצמדה למדד הופסקה',
      });
    } catch (error) {
      console.error('Error updating index linking:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לעדכן את ההגדרה',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle>הצמדה למדד המחירים לצרכן</CardTitle>
        </div>
        <CardDescription>
          הפעל כדי לאפשר הוספת הוצאות חוזרות (מזונות, מדור וכו') הצמודות למדד.
          הסכום יתעדכן אוטומטית לפי נתוני הלמ"ס.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="index-linking" className="text-base font-medium">
              צמוד למדד
            </Label>
            <p className="text-sm text-muted-foreground">
              רק אם מופעל – תוכל להוסיף הוצאות חוזרות צמודות למדד
            </p>
          </div>
          <Switch
            id="index-linking"
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={!isAdmin || isUpdating}
          />
        </div>

        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <p className="text-muted-foreground">
            <strong>רצפת מדד:</strong> כברירת מחדל, הסכום לא יורד מתחת לסכום הבסיס גם במקרה של מדד שלילי.
          </p>
        </div>

        <a
          href={CBS_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ExternalLink className="h-4 w-4" />
          מקור הנתונים: הלמ"ס – מדד המחירים לצרכן
        </a>
      </CardContent>
    </Card>
  );
};
