/**
 * MonthlyBudgetCard — lets the account admin set an optional spending budget
 * per billing cycle. NULL = budget tracking disabled (HeroBalanceCard's
 * progress bar hides). Pairs with the Dashboard hero card.
 *
 * Budget is interpreted *per billing cycle*, not per calendar month, so an
 * account with billing_cycle_start_day=15 has a "15-of-month → 14-of-next"
 * window. The cycle math is the HeroBalanceCard's concern; this card only
 * persists the raw number.
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Target } from 'lucide-react';

interface MonthlyBudgetCardProps {
  accountId: string | undefined;
  currentBudget: number | null | undefined;
  isAdmin: boolean;
}

export function MonthlyBudgetCard({
  accountId,
  currentBudget,
  isAdmin,
}: MonthlyBudgetCardProps) {
  // We keep the input as a string so the user can fully clear it ("" = disable).
  // Numbers stored in `accounts.monthly_budget` are NUMERIC(12,2).
  const [draft, setDraft] = useState<string>(
    currentBudget != null ? String(currentBudget) : '',
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  // Keep the input in sync when the parent re-fetches the account
  useEffect(() => {
    setDraft(currentBudget != null ? String(currentBudget) : '');
  }, [currentBudget]);

  const handleSave = async () => {
    if (!accountId || !isAdmin) return;

    const trimmed = draft.trim();
    let parsed: number | null;
    if (trimmed === '') {
      parsed = null;
    } else {
      const n = Number(trimmed);
      if (!Number.isFinite(n) || n < 0) {
        toast({
          title: 'שגיאה',
          description: 'אנא הזן סכום תקף (₪0 ומעלה) או השאר ריק לכיבוי',
          variant: 'destructive',
        });
        return;
      }
      parsed = n;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('accounts')
        .update({ monthly_budget: parsed })
        .eq('id', accountId);
      if (error) throw error;

      toast({
        title: 'נשמר',
        description:
          parsed === null
            ? 'מעקב התקציב כובה. הסרגל בדשבורד יוסתר'
            : `תקציב חודשי עודכן ל-₪${parsed.toLocaleString('he-IL')}`,
      });
    } catch (err) {
      console.error('Error updating monthly budget:', err);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לעדכן את התקציב',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const draftNumber = draft.trim() === '' ? null : Number(draft);
  const isDirty =
    (draftNumber ?? null) !== (currentBudget ?? null) &&
    !(draftNumber !== null && !Number.isFinite(draftNumber));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <CardTitle>תקציב חודשי</CardTitle>
        </div>
        <CardDescription>
          הגדר תקציב לכל מחזור חיוב כדי לראות פס התקדמות וחיווי חריגה בדשבורד.
          השאר ריק כדי להשבית.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="monthly-budget" className="text-sm font-medium">
            סכום (₪)
          </Label>
          <div className="flex gap-2">
            <Input
              id="monthly-budget"
              type="number"
              inputMode="numeric"
              min={0}
              step={50}
              placeholder="לדוגמה: 4000"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={!isAdmin || isUpdating}
              className="tabular-nums"
            />
            <Button
              onClick={handleSave}
              disabled={!isAdmin || isUpdating || !isDirty}
              className="shrink-0"
            >
              {isUpdating ? 'שומר...' : 'שמור'}
            </Button>
          </div>
          {!isAdmin && (
            <p className="text-xs text-muted-foreground">
              רק מנהל החשבון יכול לערוך תקציב
            </p>
          )}
        </div>

        <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          <p>
            <strong>חריגה:</strong> אם ההוצאות יחרגו מהתקציב או מ-1.2× ממוצע
            3 המחזורים האחרונים, הכרטיס בדשבורד יעבור לרקע חם כסימן אזהרה.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
