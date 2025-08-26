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
import { 
  Edit, 
  Trash2, 
  Calendar, 
  Repeat, 
  FileText,
  DollarSign,
  User,
  Tag,
  Clock,
  Users,
  Plus
} from 'lucide-react';
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

  if (expenses.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/80 backdrop-blur-sm border border-border/50 shadow-lg animate-fade-in" dir="rtl">
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-full">
              <Repeat className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">אין הוצאות חוזרות</h3>
              <p className="text-muted-foreground">צור הוצאות שחוזרות על עצמן באופן קבוע</p>
            </div>
            <AddRecurringExpenseModal 
              onSuccess={refreshData}
              childrenList={childrenList}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/80 backdrop-blur-sm border border-border/50 shadow-lg animate-fade-in" dir="rtl">
      <CardHeader>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-lg">
                <Repeat className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              הוצאות חוזרות ({expenses.length})
            </CardTitle>
            <CardDescription className="mt-1">
              ניהול הוצאות שחוזרות על עצמן באופן קבוע
            </CardDescription>
          </div>
          
          <AddRecurringExpenseModal 
            onSuccess={refreshData}
            childrenList={childrenList}
          />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 border-b border-border/50">
                <TableHead className="text-right font-semibold">
                  <div className="flex items-center gap-2 justify-end">
                    <FileText className="h-4 w-4" />
                    תיאור
                  </div>
                </TableHead>
                <TableHead className="text-right font-semibold">
                  <div className="flex items-center gap-2 justify-end">
                    <DollarSign className="h-4 w-4" />
                    סכום
                  </div>
                </TableHead>
                <TableHead className="text-right font-semibold">
                  <div className="flex items-center gap-2 justify-end">
                    <Tag className="h-4 w-4" />
                    קטגוריה
                  </div>
                </TableHead>
                <TableHead className="text-right font-semibold">
                  <div className="flex items-center gap-2 justify-end">
                    <User className="h-4 w-4" />
                    שיוך
                  </div>
                </TableHead>
                <TableHead className="text-right font-semibold">
                  <div className="flex items-center gap-2 justify-end">
                    <Clock className="h-4 w-4" />
                    תדירות
                  </div>
                </TableHead>
                <TableHead className="text-right font-semibold">
                  <div className="flex items-center gap-2 justify-end">
                    <Users className="h-4 w-4" />
                    חלוקה
                  </div>
                </TableHead>
                <TableHead className="text-right font-semibold">
                  <div className="flex items-center gap-2 justify-end">
                    <User className="h-4 w-4" />
                    נוסף ע״י
                  </div>
                </TableHead>
                <TableHead className="text-right font-semibold">
                  <div className="flex items-center gap-2 justify-end">
                    <Users className="h-4 w-4" />
                    מי משלם
                  </div>
                </TableHead>
                <TableHead className="text-right font-semibold">
                  <div className="flex items-center gap-2 justify-end">
                    <Calendar className="h-4 w-4" />
                    יצירה
                  </div>
                </TableHead>
                <TableHead className="text-right font-semibold">
                  <div className="flex items-center gap-2 justify-end">
                    <Calendar className="h-4 w-4" />
                    סיום
                  </div>
                </TableHead>
                <TableHead className="text-right font-semibold">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense, index) => (
                <TableRow 
                  key={expense.id}
                  className="border-b border-border/30 hover:bg-muted/20 transition-colors duration-200 group animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <TableCell className="font-medium text-right">
                    <div className="max-w-xs">
                      <p className="font-medium truncate">{expense.description}</p>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <DollarSign className="h-3 w-3 text-green-600" />
                      <span className="font-bold text-lg">₪{expense.amount.toFixed(0)}</span>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      {expense.category || 'לא צוין'}
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-medium">{getChildName(expense.childId)}</span>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700">
                      <Clock className="h-3 w-3 mr-1" />
                      {getFrequencyLabel(expense.frequency)}
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <Badge variant={expense.splitEqually ? "default" : "outline"} className={expense.splitEqually ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : ""}>
                      {expense.splitEqually ? 'חצי-חצי' : 'מלא'}
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{getCreatorName(expense.createdBy)}</span>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-medium">{getPayerName(expense.paidById)}</span>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{format(new Date(expense.date), 'dd/MM/yyyy')}</span>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    {expense.hasEndDate && expense.endDate ? (
                      <div className="flex items-center gap-2 justify-end">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(expense.endDate), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    ) : (
                      <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                        ללא הגבלה
                      </Badge>
                    )}
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="עריכה"
                        onClick={() => setEditingExpense(expense)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="מחיקה"
                            disabled={isDeletingExpense === expense.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-right">האם אתה בטוח?</AlertDialogTitle>
                            <AlertDialogDescription className="text-right">
                              פעולה זו תמחק את ההוצאה החוזרת "{expense.description}" לצמיתות.
                              ההוצאות שכבר נוצרו בעבר לא יימחקו.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-row-reverse gap-2">
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
              ))}
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