import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { schoolYearLabelHebrew } from '@/lib/hebrewDates';
import { schoolCalendarService } from '@/integrations/supabase/schoolCalendarService';
import { cn } from '@/lib/utils';

interface ImportYearDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

type Source = 'hebcal' | 'clone' | 'empty';

export const ImportYearDialog: React.FC<ImportYearDialogProps> = ({
  open,
  onOpenChange,
  onImported,
}) => {
  const [year, setYear] = useState<string>(defaultYear());
  const [source, setSource] = useState<Source>('hebcal');
  const [importing, setImporting] = useState(false);

  const yearOptions = useMemo(() => {
    const now = new Date();
    const base = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    return [base - 1, base, base + 1, base + 2].map((y) => `${y}-${y + 1}`);
  }, []);

  const handleImport = async () => {
    if (source !== 'hebcal') {
      toast.info('אופציה זו תתמך בגרסה הבאה. כרגע זמין ייבוא מ-Hebcal בלבד.');
      return;
    }
    setImporting(true);
    try {
      const { imported } = await schoolCalendarService.importYearFromHebcal(year);
      toast.success(`יובאו ${imported} חגים לשנת ${schoolYearLabelHebrew(year)}`);
      onImported();
      onOpenChange(false);
    } catch (err) {
      console.error('Import failed:', err);
      const msg = err instanceof Error ? err.message : 'שגיאה בייבוא';
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md text-right">
        <DialogHeader>
          <DialogTitle>ייבא שנה חדשה</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label className="text-sm font-semibold">שנת לימודים</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={y}>
                    {schoolYearLabelHebrew(y)} · {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-sm font-semibold">מקור ראשוני</Label>
            <RadioGroup value={source} onValueChange={(v) => setSource(v as Source)}>
              <div className="space-y-2">
                <SourceRow
                  value="hebcal"
                  active={source === 'hebcal'}
                  title="Hebcal — חגים יהודיים (מומלץ)"
                  hint="טוען אוטומטית את ראש השנה, סוכות, חנוכה, פסח, שבועות וכו'. החופשות הארוכות (חופש גדול, חופשת פסח) מתווספות ידנית אחר-כך."
                />
                <SourceRow
                  value="clone"
                  active={source === 'clone'}
                  title="שכפל משנה קודמת"
                  hint="העתק את כל האירועים מהשנה הקודמת ותעדכן ידנית את התאריכים (יגיע בגרסה הבאה)."
                  disabled
                />
                <SourceRow
                  value="empty"
                  active={source === 'empty'}
                  title="ריק (אגדיר ידנית)"
                  hint="התחל מאפס, הוסף כל אירוע בנפרד (יגיע בגרסה הבאה)."
                  disabled
                />
              </div>
            </RadioGroup>
          </div>

          <Alert>
            <AlertDescription className="text-xs">
              Hebcal הוא ספריית קוד פתוח של חגי ישראל. הייבוא משייך את החגים לכל ארבעת מסגרות החינוך.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={importing}
              className="flex-1"
            >
              ביטול
            </Button>
            <Button onClick={handleImport} disabled={importing} className="flex-1">
              {importing ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  מייבא...
                </>
              ) : (
                'המשך'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const SourceRow: React.FC<{
  value: string;
  active: boolean;
  title: string;
  hint: string;
  disabled?: boolean;
}> = ({ value, active, title, hint, disabled }) => (
  <label
    className={cn(
      'flex items-start gap-3 p-3 rounded-lg border-2 transition-all',
      disabled && 'opacity-50 cursor-not-allowed',
      !disabled && 'cursor-pointer hover:border-primary/40',
      active && !disabled && 'border-primary bg-primary/5',
      !active && 'border-border',
    )}
  >
    <RadioGroupItem value={value} disabled={disabled} className="mt-0.5" />
    <div className="flex-1">
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
    </div>
  </label>
);

function defaultYear(): string {
  const now = new Date();
  const base = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${base}-${base + 1}`;
}
