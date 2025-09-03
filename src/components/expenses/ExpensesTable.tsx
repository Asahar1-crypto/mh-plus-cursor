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
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from './StatusBadge';
import { Expense } from '@/contexts/expense/types';
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';
import { 
  Check, 
  X, 
  Calendar, 
  User, 
  Tag, 
  FileText,
  CheckSquare,
  Square,
  Users,
  Zap
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { memberService } from '@/contexts/auth/services/account/memberService';

interface ExpensesTableProps {
  expenses: Expense[];
  approveExpense: (id: string) => Promise<void>;
  rejectExpense: (id: string) => Promise<void>;
  markAsPaid: (id: string) => Promise<void>;
  updateExpenseStatus: (id: string, status: Expense['status']) => Promise<void>;
}

export const ExpensesTable: React.FC<ExpensesTableProps> = ({ 
  expenses, 
  approveExpense, 
  rejectExpense, 
  markAsPaid,
  updateExpenseStatus
}) => {
  const { account } = useAuth();
  const [selectedPendingExpenses, setSelectedPendingExpenses] = useState<string[]>([]);
  const [selectedApprovedExpenses, setSelectedApprovedExpenses] = useState<string[]>([]);
  const [isPerformingBulkAction, setIsPerformingBulkAction] = useState(false);

  // Get account members
  const { data: accountMembers } = useQuery({
    queryKey: ['account-members', account?.id],
    queryFn: () => memberService.getAccountMembers(account!.id),
    enabled: !!account?.id
  });

  // Reset selection when expenses change
  useEffect(() => {
    setSelectedPendingExpenses([]);
    setSelectedApprovedExpenses([]);
  }, [expenses]);

  const pendingExpenses = expenses.filter(expense => expense.status === 'pending');
  const approvedExpenses = expenses.filter(expense => expense.status === 'approved');

  const allPendingSelected = pendingExpenses.length > 0 && selectedPendingExpenses.length === pendingExpenses.length;
  const allApprovedSelected = approvedExpenses.length > 0 && selectedApprovedExpenses.length === approvedExpenses.length;

  const toggleAllPending = () => {
    if (allPendingSelected) {
      setSelectedPendingExpenses([]);
    } else {
      setSelectedPendingExpenses(pendingExpenses.map(expense => expense.id));
    }
  };

  const toggleAllApproved = () => {
    if (allApprovedSelected) {
      setSelectedApprovedExpenses([]);
    } else {
      setSelectedApprovedExpenses(approvedExpenses.map(expense => expense.id));
    }
  };

  const bulkApprove = async () => {
    if (selectedPendingExpenses.length === 0) return;

    setIsPerformingBulkAction(true);
    try {
      await Promise.all(selectedPendingExpenses.map(id => approveExpense(id)));
      toast.success(`אושרו ${selectedPendingExpenses.length} הוצאות בהצלחה`);
      setSelectedPendingExpenses([]);
    } catch (error) {
      toast.error('שגיאה באישור ההוצאות');
    } finally {
      setIsPerformingBulkAction(false);
    }
  };

  const bulkMarkAsPaid = async () => {
    if (selectedApprovedExpenses.length === 0) return;

    setIsPerformingBulkAction(true);
    try {
      await Promise.all(selectedApprovedExpenses.map(id => markAsPaid(id)));
      toast.success(`סומנו כשולם ${selectedApprovedExpenses.length} הוצאות בהצלחה`);
      setSelectedApprovedExpenses([]);
    } catch (error) {
      toast.error('שגיאה בסימון ההוצאות כשולמות');
    } finally {
      setIsPerformingBulkAction(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveExpense(id);
      toast.success('ההוצאה אושרה בהצלחה');
    } catch (error) {
      toast.error('שגיאה באישור ההוצאה');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectExpense(id);
      toast.success('ההוצאה נדחתה');
    } catch (error) {
      toast.error('שגיאה בדחיית ההוצאה');
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      await markAsPaid(id);
      toast.success('ההוצאה סומנה כשולמה');
    } catch (error) {
      toast.error('שגיאה בסימון ההוצאה כשולמה');
    }
  };

  const handleStatusChange = async (expenseId: string, newStatus: Expense['status']) => {
    try {
      await updateExpenseStatus(expenseId, newStatus);
      toast.success('הסטטוס עודכן בהצלחה');
    } catch (error) {
      toast.error('שגיאה בעדכון הסטטוס');
    }
  };

  if (expenses.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/80 backdrop-blur-sm border border-border/50 shadow-lg animate-fade-in">
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-muted/30 rounded-full">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">אין הוצאות להצגה</h3>
              <p className="text-muted-foreground">נסה לשנות את הפילטרים או להוסיף הוצאה חדשה</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/80 backdrop-blur-sm border border-border/50 shadow-lg animate-fade-in">
      <CardHeader>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              הוצאות ({expenses.length})
            </CardTitle>
            <CardDescription className="mt-1">
              ניהול ואישור הוצאות משותפות
            </CardDescription>
          </div>

          {/* Bulk Actions */}
          <div className="flex flex-wrap gap-2">
            {pendingExpenses.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant={allPendingSelected ? "default" : "outline"}
                  size="sm"
                  onClick={toggleAllPending}
                  className="flex items-center gap-2"
                >
                  {allPendingSelected ? <CheckSquare className="h-3 w-3" /> : <Square className="h-3 w-3" />}
                  כל הממתינות ({pendingExpenses.length})
                </Button>
                {selectedPendingExpenses.length > 0 && (
                  <Button
                    onClick={bulkApprove}
                    disabled={isPerformingBulkAction}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    אשר ({selectedPendingExpenses.length})
                  </Button>
                )}
              </div>
            )}

            {approvedExpenses.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant={allApprovedSelected ? "default" : "outline"}
                  size="sm"
                  onClick={toggleAllApproved}
                  className="flex items-center gap-2"
                >
                  {allApprovedSelected ? <CheckSquare className="h-3 w-3" /> : <Square className="h-3 w-3" />}
                  כל המאושרות ({approvedExpenses.length})
                </Button>
                {selectedApprovedExpenses.length > 0 && (
                  <Button
                    onClick={bulkMarkAsPaid}
                    disabled={isPerformingBulkAction}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <span className="ml-1">סמן כשולם ({selectedApprovedExpenses.length})</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table dir="rtl">
            <TableHeader>
              <TableRow className="bg-muted/30 border-b border-border/50">
                <TableHead className="text-right font-semibold">בחר</TableHead>
                <TableHead className="text-right font-semibold">
                  <div className="flex items-center gap-2 justify-end">
                    <Calendar className="h-4 w-4" />
                    תאריך
                  </div>
                </TableHead>
                <TableHead className="text-right font-semibold">
                  <div className="flex items-center gap-2 justify-end">
                    <FileText className="h-4 w-4" />
                    תיאור
                  </div>
                </TableHead>
                <TableHead className="text-right font-semibold">
                  <div className="flex items-center gap-2 justify-end">
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
                    ילד
                  </div>
                </TableHead>
                <TableHead className="text-right font-semibold">
                  <div className="flex items-center gap-2 justify-end">
                    <Users className="h-4 w-4" />
                    משלם
                  </div>
                </TableHead>
                <TableHead className="text-right font-semibold">
                  <div className="flex items-center gap-2 justify-end">
                    <Zap className="h-4 w-4" />
                    סטטוס
                  </div>
                </TableHead>
                <TableHead className="text-right font-semibold">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense, index) => {
                const creatorName = accountMembers?.find(m => m.user_id === expense.createdBy)?.user_name || 'לא ידוע';
                const paidByName = accountMembers?.find(m => m.user_id === expense.paidById)?.user_name || 'לא ידוע';
                
                return (
                  <TableRow 
                    key={expense.id} 
                    className="border-b border-border/30 hover:bg-muted/20 transition-colors duration-200 group animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <TableCell className="w-12">
                      {expense.status === 'pending' && (
                        <Checkbox
                          checked={selectedPendingExpenses.includes(expense.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedPendingExpenses([...selectedPendingExpenses, expense.id]);
                            } else {
                              setSelectedPendingExpenses(selectedPendingExpenses.filter(id => id !== expense.id));
                            }
                          }}
                          className="group-hover:scale-110 transition-transform duration-200"
                        />
                      )}
                      {expense.status === 'approved' && (
                        <Checkbox
                          checked={selectedApprovedExpenses.includes(expense.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedApprovedExpenses([...selectedApprovedExpenses, expense.id]);
                            } else {
                              setSelectedApprovedExpenses(selectedApprovedExpenses.filter(id => id !== expense.id));
                            }
                          }}
                          className="group-hover:scale-110 transition-transform duration-200"
                        />
                      )}
                    </TableCell>
                    
                    <TableCell className="font-medium text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <span>{format(new Date(expense.date), 'dd/MM/yyyy')}</span>
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="max-w-xs text-right">
                        <p className="font-medium truncate">{expense.description}</p>
                        <p className="text-xs text-muted-foreground">נוצר על ידי: {creatorName}</p>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="font-bold text-lg">₪{expense.amount}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          {expense.category || 'לא צוין'}
                        </Badge>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      {expense.childName ? (
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-sm font-medium">{expense.childName}</span>
                          <User className="h-3 w-3 text-muted-foreground" />
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">כללי</span>
                      )}
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-sm font-medium">{paidByName}</span>
                          <Users className="h-3 w-3 text-muted-foreground" />
                        </div>
                        {expense.splitEqually && (
                          <div className="flex justify-end">
                            <Badge variant="secondary" className="text-xs">
                              חלוקה שווה
                            </Badge>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <Select
                          value={expense.status}
                          onValueChange={(value) => handleStatusChange(expense.id, value as Expense['status'])}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">ממתין</SelectItem>
                            <SelectItem value="approved">מאושר</SelectItem>
                            <SelectItem value="paid">שולם</SelectItem>
                            <SelectItem value="rejected">נדחה</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {expense.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleApprove(expense.id)}
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleReject(expense.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {expense.status === 'approved' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMarkAsPaid(expense.id)}
                            className="h-8 px-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <span className="ml-1">סמן כשולם</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};