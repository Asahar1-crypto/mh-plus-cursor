import React, { useState, useEffect } from 'react';
import { Check, Edit2, Trash2, AlertTriangle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useExpense } from '@/contexts/expense/useExpense';
import { useAuth } from '@/contexts/auth';

interface ScanResult {
  date: string;
  vendor: string;
  total: number;
  currency?: string;
  confidence_score?: number;
  items: {
    name: string;
    price: number;
    quantity?: number;
    category: string;
  }[];
}

const PAYMENT_TYPES = [
  { value: 'i_paid_shared', label: 'שילמתי - הוצאה משותפת' },
  { value: 'i_paid_theirs', label: 'שילמתי עבורם' },
  { value: 'they_paid_shared', label: 'הם שילמו - הוצאה משותפת' },
  { value: 'they_paid_mine', label: 'הם שילמו עבורי' },
  { value: 'i_owe_them', label: 'אני חייב להם' },
  { value: 'they_owe_me', label: 'הם חייבים לי' }
];

interface ReceiptValidationProps {
  scanResult: ScanResult;
  onApprove: () => void;
  onCancel: () => void;
}

const CATEGORIES = [
  'מזון',
  'ביגוד', 
  'חינוך',
  'בריאות',
  'ציוד תינוקות',
  'משחקים',
  'ספרים',
  'אחר'
];

// Map English categories from scan to Hebrew categories
const CATEGORY_MAPPING: Record<string, string> = {
  'food': 'מזון',
  'clothing': 'ביגוד',
  'education': 'חינוך',
  'health': 'בריאות',
  'baby': 'ציוד תינוקות',
  'toys': 'משחקים',
  'books': 'ספרים',
  'other': 'אחר',
  'general': 'אחר'
};

export const ReceiptValidation: React.FC<ReceiptValidationProps> = ({
  scanResult,
  onApprove,
  onCancel
}) => {
  const [editedItems, setEditedItems] = useState(scanResult.items);
  const [editedDate, setEditedDate] = useState(scanResult.date);
  const [editedVendor, setEditedVendor] = useState(scanResult.vendor);
  const [selectedChildren, setSelectedChildren] = useState<Record<number, string>>({});
  const [paymentTypes, setPaymentTypes] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const { addExpense, childrenList } = useExpense();
  const { user, account } = useAuth();

  // Convert English categories to Hebrew and set initial payment types
  useEffect(() => {
    const convertedItems = scanResult.items.map(item => ({
      ...item,
      category: CATEGORY_MAPPING[item.category.toLowerCase()] || 'אחר'
    }));
    setEditedItems(convertedItems);
    
    // Set default payment types for all items
    const defaultPaymentTypes: Record<number, string> = {};
    convertedItems.forEach((_, index) => {
      defaultPaymentTypes[index] = 'i_paid_shared';
    });
    setPaymentTypes(defaultPaymentTypes);
  }, []);

  const confidenceScore = scanResult.confidence_score || 0;
  const isLowConfidence = confidenceScore < 60;

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...editedItems];
    updated[index] = { ...updated[index], [field]: value };
    setEditedItems(updated);
  };

  const removeItem = (index: number) => {
    const updated = editedItems.filter((_, i) => i !== index);
    setEditedItems(updated);
  };

  const addNewItem = () => {
    const newIndex = editedItems.length;
    setEditedItems([
      ...editedItems,
      { name: '', price: 0, quantity: 1, category: 'אחר' }
    ]);
    // Set default payment type for new item
    setPaymentTypes(prev => ({ ...prev, [newIndex]: 'i_paid_shared' }));
  };

  const calculateTotal = () => {
    return editedItems.reduce((sum, item) => sum + item.price, 0);
  };

  const handleSubmit = async () => {
    if (!user) return;

    setIsSubmitting(true);

    try {
      // Create expenses for each item
      for (let i = 0; i < editedItems.length; i++) {
        const item = editedItems[i];
        const childId = selectedChildren[i];
        const paymentType = paymentTypes[i] || 'i_paid_shared';

        if (!item.name.trim() || item.price <= 0) {
          toast({
            variant: "destructive",
            title: "שגיאה בנתונים",
            description: `שם ומחיר חובה עבור פריט מספר ${i + 1}`
          });
          setIsSubmitting(false);
          return;
        }

        if (!paymentType) {
          toast({
            variant: "destructive",
            title: "שגיאה בנתונים",
            description: `יש לבחור סוג תשלום עבור פריט מספר ${i + 1}`
          });
          setIsSubmitting(false);
          return;
        }

        await addExpense({
          amount: item.price,
          description: `${item.name}${item.quantity && item.quantity > 1 ? ` (כמות: ${item.quantity})` : ''} - ${editedVendor}`,
          date: editedDate,
          category: item.category,
          childId,
          paidById: user.id,
          paidByName: user.name || 'משתמש',
          includeInMonthlyBalance: true,
          splitEqually: false,
          isRecurring: false
        });
      }

      toast({
        title: "ההוצאות נוספו בהצלחה!",
        description: `נוצרו ${editedItems.length} הוצאות חדשות מהחשבונית`
      });

      onApprove();

    } catch (error) {
      console.error('Error creating expenses:', error);
      toast({
        variant: "destructive",
        title: "שגיאה ביצירת הוצאות",
        description: "אירעה שגיאה בעת יצירת ההוצאות"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Confidence Score Alert */}
      {isLowConfidence && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            רמת הוודאות בזיהוי נמוכה ({confidenceScore}%). אנא בדוק את הנתונים בעיון.
          </AlertDescription>
        </Alert>
      )}

      {/* Receipt Header Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            פרטי החשבונית
            <Badge variant={isLowConfidence ? "destructive" : "default"}>
              דיוק: {confidenceScore}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="vendor">ספק</Label>
            <Input
              id="vendor"
              value={editedVendor}
              onChange={(e) => setEditedVendor(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="date">תאריך</Label>
            <Input
              id="date"
              type="date"
              value={editedDate}
              onChange={(e) => setEditedDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            פריטים בחשבונית
            <div className="text-sm font-normal">
              סה"כ מזוהה: ₪{scanResult.total} | מחושב: ₪{calculateTotal()}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם הפריט</TableHead>
                <TableHead>מחיר</TableHead>
                <TableHead>כמות</TableHead>
                <TableHead>קטגוריה</TableHead>
                <TableHead>ילד</TableHead>
                <TableHead>סוג תשלום</TableHead>
                <TableHead>פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editedItems.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Input
                      value={item.name}
                      onChange={(e) => updateItem(index, 'name', e.target.value)}
                      placeholder="שם הפריט"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.price}
                      onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.quantity || 1}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      min="1"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.category}
                      onValueChange={(value) => updateItem(index, 'category', value)}
                    >
                      <SelectTrigger className="min-w-[120px]">
                        <SelectValue placeholder="בחר קטגוריה" />
                      </SelectTrigger>
                      <SelectContent className="z-[200]">
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={selectedChildren[index] || "none"}
                      onValueChange={(value) => 
                        setSelectedChildren(prev => ({ ...prev, [index]: value === "none" ? "" : value }))
                      }
                    >
                      <SelectTrigger className="min-w-[120px]">
                        <SelectValue placeholder="בחר ילד" />
                      </SelectTrigger>
                      <SelectContent className="z-[200]">
                        <SelectItem value="none">ללא שיוך</SelectItem>
                        {childrenList.map((child) => (
                          <SelectItem key={child.id} value={child.id}>
                            {child.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={paymentTypes[index] || "i_paid_shared"}
                      onValueChange={(value) => 
                        setPaymentTypes(prev => ({ ...prev, [index]: value }))
                      }
                    >
                      <SelectTrigger className="min-w-[160px]">
                        <SelectValue placeholder="בחר סוג תשלום" />
                      </SelectTrigger>
                      <SelectContent className="z-[200]">
                        {PAYMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      disabled={editedItems.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Button
            variant="outline"
            onClick={addNewItem}
            className="mt-4 w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            הוסף פריט
          </Button>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || editedItems.length === 0}
          className="flex-1"
        >
          {isSubmitting ? (
            "יוצר הוצאות..."
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              אשר ויצור הוצאות ({editedItems.length})
            </>
          )}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          ביטול
        </Button>
      </div>
    </div>
  );
};
