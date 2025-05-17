
import React from 'react';
import { format } from 'date-fns';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { StatusBadge } from './StatusBadge';
import { Expense } from '@/contexts/expense/types';
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';

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
  const handleApproveExpense = async (id: string) => {
    try {
      await approveExpense(id);
      console.log('Expense approved successfully', id);
    } catch (error) {
      console.error('Error approving expense:', error);
      toast.error('אירעה שגיאה בעת אישור ההוצאה');
    }
  };

  const handleRejectExpense = async (id: string) => {
    try {
      await rejectExpense(id);
      console.log('Expense rejected successfully', id);
    } catch (error) {
      console.error('Error rejecting expense:', error);
      toast.error('אירעה שגיאה בעת דחיית ההוצאה');
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      await markAsPaid(id);
      console.log('Expense marked as paid successfully', id);
    } catch (error) {
      console.error('Error marking expense as paid:', error);
      toast.error('אירעה שגיאה בעת סימון ההוצאה כשולמה');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-xl">רשימת הוצאות</CardTitle>
        <CardDescription>סה״כ {expenses.length} הוצאות</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
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
                      <div className="flex space-x-2">
                        {expense.status === 'pending' && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleApproveExpense(expense.id)}
                              className="text-green-600 hover:text-green-800 hover:bg-green-50 h-7 px-2"
                            >
                              אישור
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleRejectExpense(expense.id)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 h-7 px-2"
                            >
                              דחייה
                            </Button>
                          </>
                        )}
                        {expense.status === 'approved' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleMarkAsPaid(expense.id)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-7 px-2"
                          >
                            סמן כשולם
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
