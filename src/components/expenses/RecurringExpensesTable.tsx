import React, { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Expense, Child } from '@/contexts/expense/types';
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';
import { Edit, Trash2, Calendar, Repeat } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { memberService } from '@/contexts/auth/services/account/memberService';
import { supabase } from '@/integrations/supabase/client';
import { EditRecurringExpenseModal } from './EditRecurringExpenseModal';
import { AddRecurringExpenseModal } from './AddRecurringExpenseModal';

interface RecurringExpensesTableProps {
  expenses: Expense[];
  childrenList: Child[];
  refreshData: () => Promise<void>;
}

export const RecurringExpensesTable: React.FC<RecurringExpensesTableProps> = ({ 
  expenses, 
  childrenList,
  refreshData 
}) => {
  const { account, user } = useAuth();
  const [isDeletingExpense, setIsDeletingExpense] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Get account members
  const { data: accountMembers } = useQuery({
    queryKey: ['account-members', account?.id],
    queryFn: () => memberService.getAccountMembers(account!.id),
    enabled: !!account?.id
  });

  const getChildName = (childId?: string) => {
    if (!childId) return 'הוצאה כללית';
    const child = childrenList.find(c => c.id === childId);
    return child?.name || 'ילד לא ידוע';
  };

  const getCreatorName = (createdById: string) => {
    if (!accountMembers) return 'טוען...';
    const creator = accountMembers.find(member => member.user_id === createdById);
    return creator?.user_name || 'לא ידוע';
  };

  const getPayerName = (paidById: string) => {
    if (!accountMembers) return 'טוען...';
    const payer = accountMembers.find(member => member.user_id === paidById);
    return payer?.user_name || 'לא ידוע';
  };

  const getFrequencyLabel = (frequency?: string) => {
    switch (frequency) {
      case 'monthly': return 'חודשי';
      case 'weekly': return 'שבועי';
      case 'yearly': return 'שנתי';
      default: return 'לא הוגדר';
    }
  };

  const handleDeleteRecurring = async (expenseId: string) => {
    if (!user || !account) return;
    
    setIsDeletingExpense(expenseId);
    
    try {
      // Delete the recurring expense from database
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)
        .eq('account_id', account.id);

      if (error) throw error;

      toast.success('הוצאה חוזרת נמחקה בהצלחה');
      await refreshData();
    } catch (error) {
      console.error('Error deleting recurring expense:', error);
      toast.error('שגיאה במחיקת ההוצאה החוזרת');
    } finally {
      setIsDeletingExpense(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Repeat className="h-5 w-5" />
              הוצאות חוזרות
            </CardTitle>
            <CardDescription>
              ניהול הוצאות שחוזרות על עצמן באופן קבוע • סה״כ {expenses.length} הוצאות חוזרות
            </CardDescription>
          </div>
          <AddRecurringExpenseModal 
            onSuccess={refreshData}
            childrenList={childrenList}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">תיאור</TableHead>
                <TableHead className="text-right">סכום</TableHead>
                <TableHead className="text-right">קטגוריה</TableHead>
                <TableHead className="text-right">שיוך</TableHead>
                <TableHead className="text-right">תדירות</TableHead>
                <TableHead className="text-right">חלוקה</TableHead>
                <TableHead className="text-right">נוסף ע"י</TableHead>
                <TableHead className="text-right">מי משלם</TableHead>
                <TableHead className="text-right">תאריך יצירה</TableHead>
                <TableHead className="text-right">תאריך סיום</TableHead>
                <TableHead className="text-right">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length > 0 ? (
                expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">
                      {expense.description}
                    </TableCell>
                    <TableCell>₪{expense.amount.toFixed(2)}</TableCell>
                    <TableCell>{expense.category}</TableCell>
                    <TableCell>{getChildName(expense.childId)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getFrequencyLabel(expense.frequency)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={expense.splitEqually ? "default" : "outline"}>
                        {expense.splitEqually ? 'חצי-חצי' : 'מלא'}
                      </Badge>
                    </TableCell>
                    <TableCell>{getCreatorName(expense.createdBy)}</TableCell>
                    <TableCell>{getPayerName(expense.paidById)}</TableCell>
                    <TableCell>
                      {format(new Date(expense.date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      {expense.hasEndDate && expense.endDate ? (
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(expense.endDate), 'dd/MM/yyyy')}
                        </span>
                      ) : (
                        <Badge variant="outline">ללא הגבלה</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="עריכה"
                          onClick={() => setEditingExpense(expense)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              title="מחיקה"
                              disabled={isDeletingExpense === expense.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
                              <AlertDialogDescription>
                                פעולה זו תמחק את ההוצאה החוזרת "{expense.description}" לצמיתות.
                                ההוצאות שכבר נוצרו בעבר לא יימחקו.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>ביטול</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteRecurring(expense.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                מחק
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Calendar className="h-8 w-8 text-muted-foreground/50" />
                      <span>לא נמצאו הוצאות חוזרות</span>
                      <span className="text-sm">הוצאות חוזרות מאפשרות לך ליצור הוצאות שחוזרות על עצמן מדי חודש</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        <EditRecurringExpenseModal
          expense={editingExpense}
          isOpen={!!editingExpense}
          onClose={() => setEditingExpense(null)}
          onSuccess={refreshData}
          childrenList={childrenList}
        />
      </CardContent>
    </Card>
  );
};