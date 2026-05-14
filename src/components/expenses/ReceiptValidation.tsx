import React, { useState, useEffect } from 'react';
import { Check, AlertTriangle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CategoryDropdown } from './CategoryDropdown';
import { ChildDropdown } from './ChildDropdown';
import { PaymentTypeDropdown } from './PaymentTypeDropdown';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useExpense } from '@/contexts/expense/useExpense';
import { useAuth } from '@/contexts/auth';
import { checkBudgetBeforeExpense, type BudgetCheckResult } from '@/utils/budgetCheckService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useQuery } from '@tanstack/react-query';
import { memberService } from '@/contexts/auth/services/account/memberService';

interface ScanResult {
  date: string;
  vendor: string;
  total: number;
  currency?: string;
  confidence_score?: number;
  receipt_id?: string;
  invoice_number?: string | null;
  suggested_category_id?: string | null;
  category_confidence?: number;
  items: {
    name: string;
    price: number;
    quantity?: number;
    category: string;
  }[];
}

// Threshold above which the AI's suggested category auto-fills the dropdown.
// Below this we leave the dropdown at its default and the user picks manually.
const CATEGORY_AUTOFILL_THRESHOLD = 70;

interface ReceiptValidationProps {
  scanResult: ScanResult;
  onApprove: () => void;
  onCancel: () => void;
}

// Map English categories from scan to Hebrew categories
const CATEGORY_MAPPING: Record<string, string> = {
  'food': 'מזון',
  'clothing': 'ביגוד',
  'education': 'חינוך',
  'health': 'רפואה',
  'baby': 'ביגוד',
  'toys': 'פנאי',
  'books': 'חינוך',
  'other': 'אחר',
  'general': 'אחר'
};

export const ReceiptValidation: React.FC<ReceiptValidationProps> = ({
  scanResult,
  onApprove,
  onCancel
}) => {
  const [editedDate, setEditedDate] = useState(scanResult.date);
  const [editedVendor, setEditedVendor] = useState(scanResult.vendor);
  const [editedTotal, setEditedTotal] = useState(scanResult.total);
  const [selectedCategory, setSelectedCategory] = useState('מזון');
  // Tracks whether `selectedCategory` was filled in by the AI suggestion vs.
  // chosen / changed by the user. The "✨ הוצע אוטומטית" badge only shows
  // while this is true; any manual change clears it.
  const [categoryAutoFilled, setCategoryAutoFilled] = useState(false);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [paymentType, setPaymentType] = useState('i_paid_shared');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const { addExpense, childrenList, categoriesList } = useExpense();
  const categories = categoriesList.length > 0 ? categoriesList.map(c => c.name) : undefined;
  const { user, account } = useAuth();
  const [budgetAlert, setBudgetAlert] = useState<{
    open: boolean;
    result: BudgetCheckResult;
    payload: Parameters<typeof addExpense>[0];
  } | null>(null);

  // Load account members for the partner name
  const { data: accountMembers } = useQuery({
    queryKey: ['accountMembers', account?.id],
    queryFn: async () => {
      if (!account?.id) return [];
      return memberService.getAccountMembers(account.id);
    },
    enabled: !!account?.id
  });

  const otherUserName = accountMembers?.find(m => m.user_id !== user?.id)?.user_name || 'השותף/ה';
  const otherUserId = accountMembers?.find(m => m.user_id !== user?.id)?.user_id || '';

  // Apply the AI-suggested category when it landed with high enough confidence.
  // The dropdown stays editable — the user can pick anything else.
  useEffect(() => {
    const suggestedId = scanResult.suggested_category_id;
    const confidence = scanResult.category_confidence ?? 0;
    if (suggestedId && confidence >= CATEGORY_AUTOFILL_THRESHOLD && categoriesList.length > 0) {
      const match = categoriesList.find((c) => c.id === suggestedId);
      if (match) {
        setSelectedCategory(match.name);
        setCategoryAutoFilled(true);
        return;
      }
    }
    // Legacy items-based heuristic kept as a last-resort fallback for older
    // scans that don't carry the new fields.
    if (scanResult.items.length > 0) {
      const categoryCounts: Record<string, number> = {};
      scanResult.items.forEach((item) => {
        const hebrewCategory = CATEGORY_MAPPING[item.category.toLowerCase()] || 'אחר';
        categoryCounts[hebrewCategory] = (categoryCounts[hebrewCategory] || 0) + 1;
      });
      const mostCommon = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
      if (mostCommon) setSelectedCategory(mostCommon[0]);
    }
  }, [scanResult.suggested_category_id, scanResult.category_confidence, scanResult.items, categoriesList]);

  // Clear the "auto-filled" badge the moment the user changes the category.
  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setCategoryAutoFilled(false);
  };

  const confidenceScore = scanResult.confidence_score || 0;
  const isLowConfidence = confidenceScore < 60;

  // Calculate sum of items for comparison
  const calculatedTotal = scanResult.items.reduce((sum, item) => sum + item.price, 0);

  const handleSubmit = async () => {
    if (!user) return;

    if (editedTotal <= 0) {
      toast({
        variant: "destructive",
        title: "שגיאה בנתונים",
        description: "סכום החשבונית חייב להיות גדול מ-0"
      });
      return;
    }

    if (!editedVendor.trim()) {
      toast({
        variant: "destructive",
        title: "שגיאה בנתונים",
        description: "יש להזין שם ספק"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Determine paidById based on payment type (who owes)
      let paidById: string;
      let splitEqually = false;

      switch (paymentType) {
        case 'i_paid_shared':
          // אני שילמתי - יש לחלוק
          paidById = otherUserId;
          splitEqually = true;
          break;
        case 'i_paid_theirs':
          // שילמתי - על השותף להחזיר
          paidById = otherUserId;
          splitEqually = false;
          break;
        case 'they_paid_shared':
          // השותף שילם - יש לחלוק
          paidById = user.id;
          splitEqually = true;
          break;
        case 'they_paid_mine':
          // השותף שילם - עליי להחזיר
          paidById = user.id;
          splitEqually = false;
          break;
        default:
          paidById = user.id;
      }

      const paidByMember = accountMembers?.find(m => m.user_id === paidById);
      const payload = {
        amount: editedTotal,
        description: editedVendor,
        date: editedDate,
        category: selectedCategory,
        childId: selectedChild || undefined,
        paidById: paidById,
        paidByName: paidByMember?.user_name || user.name || 'משתמש',
        includeInMonthlyBalance: true,
        splitEqually: splitEqually,
        isRecurring: false,
        receiptId: scanResult.receipt_id,
        invoiceNumber: scanResult.invoice_number ?? undefined,
      };

      if (account?.id) {
        try {
          const checkResult = await checkBudgetBeforeExpense(
            account.id,
            selectedCategory,
            editedTotal,
            typeof editedDate === 'string' ? editedDate : (editedDate as Date)?.toISOString?.()?.slice(0, 10)
          );
          if (checkResult.status === 'warning_90' || checkResult.status === 'exceeded') {
            setBudgetAlert({ open: true, result: checkResult, payload });
            setIsSubmitting(false);
            return;
          }
        } catch {
          // Budget check failed - proceed
        }
      }

      await addExpense(payload);

      toast({
        title: "ההוצאה נוספה בהצלחה!",
        description: `נוצרה הוצאה חדשה: ${editedVendor} - ₪${editedTotal}`
      });

      onApprove();

    } catch (error) {
      console.error('Error creating expense:', error);
      const isDupInvoice = (error as { isDuplicateInvoice?: boolean })?.isDuplicateInvoice;
      toast({
        variant: 'destructive',
        title: isDupInvoice ? 'חשבונית כפולה' : 'שגיאה ביצירת הוצאה',
        description: isDupInvoice
          ? (error as Error).message
          : 'אירעה שגיאה בעת יצירת ההוצאה',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBudgetAlertConfirm = async () => {
    if (!budgetAlert) return;
    setIsSubmitting(true);
    setBudgetAlert(null);
    try {
      await addExpense(budgetAlert.payload);
      toast({
        title: "ההוצאה נוספה בהצלחה!",
        description: `נוצרה הוצאה חדשה: ${editedVendor} - ₪${editedTotal}`
      });
      onApprove();
    } catch (error) {
      console.error('Error creating expense:', error);
      const isDupInvoice = (error as { isDuplicateInvoice?: boolean })?.isDuplicateInvoice;
      toast({
        variant: 'destructive',
        title: isDupInvoice ? 'חשבונית כפולה' : 'שגיאה ביצירת הוצאה',
        description: isDupInvoice
          ? (error as Error).message
          : 'אירעה שגיאה בעת יצירת ההוצאה',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Confidence Score Alert */}
      {isLowConfidence && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs sm:text-sm">
            רמת הוודאות בזיהוי נמוכה ({confidenceScore}%). אנא בדוק את הנתונים בעיון.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Receipt Info - Editable */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="flex items-center justify-between text-base sm:text-lg">
            פרטי החשבונית
            <Badge variant={isLowConfidence ? "destructive" : "default"} className="text-[10px] sm:text-xs">
              דיוק: {confidenceScore}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0 space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="vendor" className="text-xs sm:text-sm">ספק / תיאור</Label>
              <Input
                id="vendor"
                value={editedVendor}
                onChange={(e) => setEditedVendor(e.target.value)}
                placeholder="שם העסק"
              />
            </div>
            <div>
              <Label htmlFor="date" className="text-xs sm:text-sm">תאריך</Label>
              <Input
                id="date"
                type="date"
                value={editedDate}
                onChange={(e) => setEditedDate(e.target.value)}
              />
            </div>
          </div>

          {/* Editable Total - Prominent */}
          <div className="p-3 sm:p-4 bg-primary/5 rounded-lg border-2 border-primary/20">
            <Label htmlFor="total" className="text-base sm:text-lg font-semibold">סה"כ לתשלום</Label>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xl sm:text-2xl font-bold">₪</span>
              <Input
                id="total"
                type="number"
                value={editedTotal}
                onChange={(e) => setEditedTotal(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                className="text-xl sm:text-2xl font-bold h-10 sm:h-14 text-center"
              />
            </div>
            {calculatedTotal !== editedTotal && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                סכום הפריטים שזוהו: ₪{calculatedTotal.toFixed(2)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Label className="text-xs sm:text-sm">קטגוריה</Label>
                {categoryAutoFilled && (
                  <Badge variant="secondary" className="text-[10px] sm:text-xs gap-1 px-1.5 py-0">
                    <Sparkles className="w-3 h-3" />
                    הוצע אוטומטית
                  </Badge>
                )}
              </div>
              <CategoryDropdown
                value={selectedCategory}
                onValueChange={handleCategoryChange}
                categories={categories}
              />
            </div>
            <div>
              <Label className="text-xs sm:text-sm">ילד</Label>
              <ChildDropdown
                children={childrenList}
                value={selectedChild || "none"}
                onValueChange={(value) => setSelectedChild(value === "none" ? "" : value)}
              />
            </div>
            <div>
              <Label className="text-xs sm:text-sm">סוג תשלום</Label>
              <PaymentTypeDropdown
                value={paymentType}
                onValueChange={setPaymentType}
                otherUserName={otherUserName}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items List - Reference Only */}
      {scanResult.items.length > 0 && (
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-sm sm:text-base">פריטים שזוהו (לעיון בלבד)</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0">
            <div className="divide-y">
              {scanResult.items.map((item, index) => (
                <div key={index} className="py-1.5 sm:py-2 flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-muted-foreground">
                    {item.name}
                    {item.quantity && item.quantity > 1 && ` (x${item.quantity})`}
                  </span>
                  <span className="font-medium">₪{item.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 text-xs sm:text-sm"
        >
          {isSubmitting ? (
            "יוצר הוצאה..."
          ) : (
            <>
              <Check className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              אשר ויצור הוצאה
            </>
          )}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting} className="w-full sm:w-auto text-xs sm:text-sm">
          ביטול
        </Button>
      </div>

      <AlertDialog open={!!budgetAlert} onOpenChange={(open) => !open && setBudgetAlert(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className={budgetAlert?.result.status === 'exceeded' ? 'text-destructive' : 'text-amber-600'}>
              {budgetAlert?.result.status === 'exceeded' ? 'חרגת מהתקציב' : 'התקציב הגיע ל-90%'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {budgetAlert && (
                <>
                  קטגוריה &quot;{budgetAlert.payload.category}&quot;: התקציב ₪{budgetAlert.result.budget.toFixed(0)},
                  הוצא עד כה ₪{budgetAlert.result.spent.toFixed(0)}. עם הוספת הוצאה זו: ₪{budgetAlert.result.newSpent.toFixed(0)}.
                  האם להמשיך בכל זאת?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleBudgetAlertConfirm}>
              המשך בכל זאת
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
