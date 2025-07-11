
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from './StatusBadge';
import { Expense } from '@/contexts/expense/types';
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';

interface ExpensesTableProps {
  expenses: Expense[];
  approveExpense: (id: string) => Promise<void>;
  rejectExpense: (id: string) => Promise<void>;
  markAsPaid: (id: string) => Promise<void>;
}

export const ExpensesTable: React.FC<ExpensesTableProps> = ({ 
  expenses, 
  approveExpense, 
  rejectExpense, 
  markAsPaid 
}) => {
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  const [isPerformingBulkAction, setIsPerformingBulkAction] = useState(false);

  // Reset selection when expenses change
  useEffect(() => {
    setSelectedExpenses([]);
  }, [expenses]);

  const pendingExpenses = expenses.filter(expense => expense.status === 'pending');
  const canShowBulkActions = pendingExpenses.length > 0;

  const handleSelectExpense = (expenseId: string) => {
    setSelectedExpenses(prev => {
      if (prev.includes(expenseId)) {
        return prev.filter(id => id !== expenseId);
      } else {
        return [...prev, expenseId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedExpenses.length === pendingExpenses.length) {
      setSelectedExpenses([]);
    } else {
      setSelectedExpenses(pendingExpenses.map(expense => expense.id));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedExpenses.length === 0) return;

    setIsPerformingBulkAction(true);
    try {
      await Promise.all(selectedExpenses.map(id => approveExpense(id)));
      toast.success(`אושרו ${selectedExpenses.length} הוצאות בהצלחה`);
      setSelectedExpenses([]);
    } catch (error) {
      toast.error('שגיאה באישור ההוצאות');
    } finally {
      setIsPerformingBulkAction(false);
    }
  };
  const handleStatusChange = async (expenseId: string, newStatus: Expense['status']) => {
    try {
      switch (newStatus) {
        case 'approved':
          await approveExpense(expenseId);
          break;
        case 'rejected':
          await rejectExpense(expenseId);
          break;
        case 'paid':
          await markAsPaid(expenseId);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error updating expense status:', error);
      // Error handling is done in the individual functions
    }
  };

  const getStatusOptions = (currentStatus: Expense['status']) => {
    const allStatuses = [
      { value: 'pending', label: 'ממתין' },
      { value: 'approved', label: 'מאושר' },
      { value: 'rejected', label: 'נדחה' },
      { value: 'paid', label: 'שולם' }
    ];

    // Return all options except the current status
    return allStatuses.filter(status => status.value !== currentStatus);
  };

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">רשימת הוצאות</CardTitle>
            <CardDescription>סה״כ {expenses.length} הוצאות</CardDescription>
          </div>
          {canShowBulkActions && selectedExpenses.length > 0 && (
            <div className="flex gap-2">
              <Button
                onClick={handleBulkApprove}
                disabled={isPerformingBulkAction}
                size="sm"
                className="flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                אשר {selectedExpenses.length} הוצאות
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedExpenses([])}
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {canShowBulkActions && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={pendingExpenses.length > 0 && selectedExpenses.length === pendingExpenses.length}
                      onCheckedChange={handleSelectAll}
                      disabled={isPerformingBulkAction}
                    />
                  </TableHead>
                )}
                <TableHead className="text-right">תאריך</TableHead>
                <TableHead className="text-right">תיאור</TableHead>
                <TableHead className="text-right">סכום</TableHead>
                <TableHead className="text-right">קטגוריה</TableHead>
                <TableHead className="text-right">שיוך</TableHead>
                <TableHead className="text-right">נוסף ע"י</TableHead>
                <TableHead className="text-right">סטטוס</TableHead>
                <TableHead className="text-right">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length > 0 ? (
                expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    {canShowBulkActions && (
                      <TableCell>
                        {expense.status === 'pending' ? (
                          <Checkbox
                            checked={selectedExpenses.includes(expense.id)}
                            onCheckedChange={() => handleSelectExpense(expense.id)}
                            disabled={isPerformingBulkAction}
                          />
                        ) : null}
                      </TableCell>
                    )}
                    <TableCell>
                      {format(new Date(expense.date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {expense.description}
                    </TableCell>
                    <TableCell>₪{expense.amount.toFixed(2)}</TableCell>
                    <TableCell>{expense.category}</TableCell>
                    <TableCell>
                      {expense.childName || 'הוצאה כללית'}
                    </TableCell>
                    <TableCell>{expense.creatorName}</TableCell>
                    <TableCell>
                      <StatusBadge status={expense.status} />
                    </TableCell>
                    <TableCell>
                      <Select
                        value=""
                        onValueChange={(newStatus: Expense['status']) => 
                          handleStatusChange(expense.id, newStatus)
                        }
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue placeholder="בחר פעולה" />
                        </SelectTrigger>
                        <SelectContent>
                          {getStatusOptions(expense.status).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={canShowBulkActions ? 9 : 8} className="text-center py-8 text-muted-foreground">
                    לא נמצאו הוצאות התואמות לפילטרים שנבחרו
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
