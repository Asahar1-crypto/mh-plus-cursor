import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet, Plus, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useExpense } from '@/contexts/ExpenseContext';
import { budgetService, Budget, AddBudgetInput } from '@/integrations/supabase/budgetService';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

const MONTH_NAMES = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

interface BudgetCardProps {
  isAdmin?: boolean;
}

function getBudgetLabel(b: Budget): string {
  if (b.categories && b.categories.length > 0) {
    return b.categories.join(', ');
  }
  return b.category || '';
}

export const BudgetCard: React.FC<BudgetCardProps> = ({ isAdmin = false }) => {
  const { account } = useAuth();
  const { categoriesList } = useExpense();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [budgetType, setBudgetType] = useState<'monthly' | 'recurring'>('monthly');
  const [newCategories, setNewCategories] = useState<string[]>([]);
  const [newAmount, setNewAmount] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState('');

  const DEFAULT_CATEGORIES = ['חינוך', 'רפואה', 'פנאי', 'ביגוד', 'מזון', 'מזונות', 'קייטנות', 'אחר'];
  const categories = categoriesList.length > 0 ? categoriesList.map(c => c.name) : DEFAULT_CATEGORIES;

  const loadBudgets = async () => {
    if (!account) return;
    setLoading(true);
    try {
      const data = await budgetService.getBudgets(account, month, year);
      setBudgets(data);
    } catch {
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBudgets();
  }, [account?.id, month, year]);

  const handleAdd = async () => {
    if (!account || !newAmount.trim()) return;
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('יש להזין סכום תקין');
      return;
    }
    if (newCategories.length === 0) {
      toast.error('יש לבחור לפחות קטגוריה אחת');
      return;
    }
    try {
      const input: AddBudgetInput = {
        budgetType,
        monthlyAmount: amount,
      };
      if (budgetType === 'monthly') {
        input.month = month;
        input.year = year;
        if (newCategories.length === 1) {
          input.category = newCategories[0];
        } else {
          input.categories = newCategories;
        }
      } else {
        input.startDate = startDate ? format(startDate, 'yyyy-MM-dd') : undefined;
        input.endDate = endDate ? format(endDate, 'yyyy-MM-dd') : undefined;
        if (newCategories.length === 1) {
          input.category = newCategories[0];
        } else {
          input.categories = newCategories;
        }
      }
      await budgetService.addBudget(account, input);
      setNewCategories([]);
      setNewAmount('');
      await loadBudgets();
      toast.success('התקציב נוסף בהצלחה');
    } catch {
      toast.error('שגיאה בהוספת התקציב');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!account || !editingAmount.trim()) return;
    const amount = parseFloat(editingAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('יש להזין סכום תקין');
      return;
    }
    try {
      await budgetService.updateBudget(account, id, { monthly_amount: amount });
      setEditingId(null);
      setEditingAmount('');
      await loadBudgets();
      toast.success('התקציב עודכן בהצלחה');
    } catch {
      toast.error('שגיאה בעדכון התקציב');
    }
  };

  const handleDelete = async (id: string) => {
    if (!account) return;
    if (!confirm('האם למחוק תקציב זה?')) return;
    try {
      await budgetService.deleteBudget(account, id);
      await loadBudgets();
      toast.success('התקציב נמחק');
    } catch {
      toast.error('שגיאה במחיקת התקציב');
    }
  };

  return (
    <Card className="bg-card/80 backdrop-blur-sm border border-border/50" dir="rtl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-start">
          <span>תקציבים</span>
          <Wallet className="h-5 w-5 mr-2" />
        </CardTitle>
        <CardDescription className="text-right">
          ניהול תקציבים לפי קטגוריה – חודש ספציפי או קבוע
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdmin && (
          <div className="flex gap-2 flex-wrap items-end justify-start">
            <Input
              type="number"
              placeholder="שנה"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value) || year)}
              className="w-[80px] text-right"
            />
            <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v, 10))}>
              <SelectTrigger className="w-[120px] text-right">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[10000]">
                {MONTH_NAMES.map((name, i) => (
                  <SelectItem key={i} value={(i + 1).toString()}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {isAdmin && (
          <div className="space-y-3 p-3 rounded-lg border bg-muted/20 text-right">
            <div className="flex gap-2 items-center justify-start">
              <span className="text-sm font-medium">סוג:</span>
              <Select value={budgetType} onValueChange={(v: 'monthly' | 'recurring') => setBudgetType(v)}>
                <SelectTrigger className="w-[140px] text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  <SelectItem value="monthly">חודש ספציפי</SelectItem>
                  <SelectItem value="recurring">קבוע</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 flex-wrap items-end justify-start">
              <Button
                onClick={handleAdd}
                disabled={newCategories.length === 0 || !newAmount.trim() || (budgetType === 'recurring' && !startDate)}
              >
                <Plus className="h-4 w-4 mr-1" />
                הוסף
              </Button>
              {budgetType === 'recurring' && (
                <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-[140px] justify-end', !endDate && 'text-muted-foreground')}>
                        {endDate ? format(endDate, 'dd/MM/yyyy') : 'סיום (אופציונלי)'}
                        <CalendarIcon className="h-4 w-4 mr-2" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="z-[10000]">
                      <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-[140px] justify-end', !startDate && 'text-muted-foreground')}>
                        {startDate ? format(startDate, 'dd/MM/yyyy') : 'התחלה'}
                        <CalendarIcon className="h-4 w-4 mr-2" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="z-[10000]">
                      <Calendar mode="single" selected={startDate} onSelect={setStartDate} />
                    </PopoverContent>
                  </Popover>
                </>
              )}
              <Input
                type="number"
                placeholder="סכום (₪)"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                className="w-[110px] text-right"
              />
              <div className="min-w-[200px]">
                <label className="text-xs text-muted-foreground mb-1 block text-right">קטגוריות (אחת או יותר)</label>
                <div className="flex flex-wrap gap-2 p-2 rounded-md border bg-background max-h-24 overflow-y-auto justify-start">
                  {categories.map((cat) => (
                    <label key={cat} className="flex items-center gap-2 cursor-pointer text-sm">
                      {cat}
                      <Checkbox
                        checked={newCategories.includes(cat)}
                        onCheckedChange={(checked) =>
                          setNewCategories((prev) =>
                            checked ? [...prev, cat] : prev.filter((c) => c !== cat)
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground text-right">טוען...</p>
        ) : (
          <div className="space-y-2">
            {budgets.map((b) => (
              <div key={b.id} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
                {editingId === b.id && isAdmin ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditingAmount(''); }}>ביטול</Button>
                    <Button size="sm" onClick={() => handleUpdate(b.id)}>שמור</Button>
                    <Input
                      type="number"
                      value={editingAmount}
                      onChange={(e) => setEditingAmount(e.target.value)}
                      className="flex-1 text-right"
                    />
                    <span className="w-32 font-medium truncate text-right">{getBudgetLabel(b)}</span>
                  </>
                ) : (
                  <>
                    <span className="flex-1 font-medium truncate text-right">
                      {getBudgetLabel(b)}
                      {b.budget_type === 'recurring' && (
                        <span className="text-xs text-muted-foreground mr-2">(קבוע)</span>
                      )}
                    </span>
                    <span className="text-lg font-semibold">₪{b.monthly_amount.toLocaleString()}</span>
                    {isAdmin && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => { setEditingId(b.id); setEditingAmount(String(b.monthly_amount)); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(b.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && budgets.length === 0 && (
          <p className="text-sm text-muted-foreground text-right">אין תקציבים. הוסף תקציב בעזרת הטפסים למעלה.</p>
        )}
      </CardContent>
    </Card>
  );
};
