import React, { useState, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Expense, Child } from '@/contexts/expense/types';
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
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { memberService } from '@/contexts/auth/services/account/memberService';
import { supabase } from '@/integrations/supabase/client';
import { EditRecurringExpenseModal } from './EditRecurringExpenseModal';
import { AddRecurringExpenseModal } from './AddRecurringExpenseModal';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
  const [isDeletingExpense, setIsDeletingExpense] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Get account members
  const { data: accountMembers } = useQuery({
    queryKey: ['account-members', account?.id],
    queryFn: () => memberService.getAccountMembers(account!.id),
    enabled: !!account?.id
  });

  // Filter expenses based on search query
  const filteredExpenses = useMemo(() => {
    if (!searchQuery.trim()) return expenses;
    const query = searchQuery.toLowerCase();
    return expenses.filter(expense => 
      expense.description?.toLowerCase().includes(query) ||
      expense.category?.toLowerCase().includes(query) ||
      expense.childName?.toLowerCase().includes(query) ||
      expense.amount.toString().includes(query)
    );
  }, [expenses, searchQuery]);

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

  const toggleRowExpanded = (id: string) => {
    setExpandedRows(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const handleDeleteRecurring = async (expenseId: string) => {
    if (!user || !account) return;
    
    setIsDeletingExpense(expenseId);
    
    try {
      // First, unlink any child expenses that reference this recurring expense
      await supabase
        .from('expenses')
        .update({ recurring_parent_id: null })
        .eq('recurring_parent_id', expenseId);

      // Then delete the recurring expense itself
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
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <div className="p-1.5 sm:p-2 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-lg">
                  <Repeat className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
                </div>
                הוצאות חוזרות ({filteredExpenses.length}{searchQuery && ` מתוך ${expenses.length}`})
              </CardTitle>
              <CardDescription className="mt-1 text-xs sm:text-sm">
                ניהול הוצאות שחוזרות על עצמן באופן קבוע
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="חיפוש..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 h-9 text-sm"
                />
              </div>
              <AddRecurringExpenseModal 
                onSuccess={refreshData}
                childrenList={childrenList}
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Empty search results */}
        {filteredExpenses.length === 0 && searchQuery && (
          <div className="p-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <Search className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">לא נמצאו תוצאות</p>
                <p className="text-sm text-muted-foreground">נסה לחפש מילה אחרת</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                נקה חיפוש
              </Button>
            </div>
          </div>
        )}

        {/* Mobile Card View */}
        {isMobile && filteredExpenses.length > 0 && (
          <div className="divide-y divide-border/30">
            {filteredExpenses.map((expense, index) => (
              <div key={expense.id} className="p-4 space-y-3 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-right truncate">{expense.description}</h3>
                    <Badge variant="secondary" className="mt-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                      <Clock className="h-3 w-3 mr-1" />
                      {getFrequencyLabel(expense.frequency)}
                    </Badge>
                  </div>
                  <div className="mr-3 text-left">
                    <p className="font-bold text-lg">₪{expense.amount.toFixed(0)}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-right">
                    <span className="text-muted-foreground">קטגוריה: </span>
                    <span>{expense.category || 'לא צוין'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground">שיוך: </span>
                    <span>{getChildName(expense.childId)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground">משלם: </span>
                    <span>{getPayerName(expense.paidById)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground">חלוקה: </span>
                    <span>{expense.splitEqually ? 'חצי-חצי' : 'מלא'}</span>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingExpense(expense)}
                    className="flex-1"
                  >
                    <Edit className="h-3 w-3 ml-1" />
                    עריכה
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                        disabled={isDeletingExpense === expense.id}
                      >
                        <Trash2 className="h-3 w-3 ml-1" />
                        מחק
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
              </div>
            ))}
          </div>
        )}

        {/* Desktop/Tablet: Compact Table Layout without horizontal scroll */}
        {!isMobile && filteredExpenses.length > 0 && (
          <div className="w-full">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow className="bg-muted/30 border-b border-border/50">
                  <TableHead className="text-right font-semibold w-10 p-2"></TableHead>
                  <TableHead className="text-right font-semibold p-2">תיאור</TableHead>
                  <TableHead className="text-right font-semibold w-24 p-2">סכום</TableHead>
                  <TableHead className="text-right font-semibold w-24 p-2">תדירות</TableHead>
                  <TableHead className="text-right font-semibold w-32 p-2">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense, index) => {
                  const isExpanded = expandedRows.includes(expense.id);
                  
                  return (
                    <React.Fragment key={expense.id}>
                      <TableRow 
                        className="border-b border-border/30 hover:bg-muted/20 transition-colors duration-200 group animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {/* Expand button */}
                        <TableCell className="w-10 p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowExpanded(expense.id)}
                            className="h-7 w-7 p-0"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        
                        {/* Description */}
                        <TableCell className="p-2">
                          <p className="font-medium truncate text-sm">{expense.description}</p>
                        </TableCell>
                        
                        {/* Amount */}
                        <TableCell className="w-24 p-2">
                          <span className="font-bold text-sm">₪{expense.amount.toFixed(0)}</span>
                        </TableCell>
                        
                        {/* Frequency */}
                        <TableCell className="w-24 p-2">
                          <Badge variant="secondary" className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                            {getFrequencyLabel(expense.frequency)}
                          </Badge>
                        </TableCell>
                        
                        {/* Actions */}
                        <TableCell className="w-32 p-2">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="עריכה"
                              onClick={() => setEditingExpense(expense)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="מחיקה"
                                  disabled={isDeletingExpense === expense.id}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
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
                      
                      {/* Expanded Details Row */}
                      {isExpanded && (
                        <TableRow className="bg-muted/10 border-b border-border/30">
                          <TableCell colSpan={5} className="p-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Tag className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <span className="text-muted-foreground text-xs">קטגוריה:</span>
                                  <p className="font-medium">{expense.category || 'לא צוין'}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <span className="text-muted-foreground text-xs">שיוך:</span>
                                  <p className="font-medium">{getChildName(expense.childId)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <span className="text-muted-foreground text-xs">משלם:</span>
                                  <p className="font-medium">{getPayerName(expense.paidById)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <span className="text-muted-foreground text-xs">נוצר על ידי:</span>
                                  <p className="font-medium">{getCreatorName(expense.createdBy)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <span className="text-muted-foreground text-xs">תאריך יצירה:</span>
                                  <p className="font-medium">{format(new Date(expense.date), 'dd/MM/yyyy')}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <span className="text-muted-foreground text-xs">חלוקה:</span>
                                  <p className="font-medium">{expense.splitEqually ? 'חצי-חצי' : 'מלא'}</p>
                                </div>
                              </div>
                              {expense.hasEndDate && expense.endDate && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <span className="text-muted-foreground text-xs">תאריך סיום:</span>
                                    <p className="font-medium">{format(new Date(expense.endDate), 'dd/MM/yyyy')}</p>
                                  </div>
                                </div>
                              )}
                              {!expense.hasEndDate && (
                                <div className="col-span-2 md:col-span-1">
                                  <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                    ללא הגבלת זמן
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        
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
