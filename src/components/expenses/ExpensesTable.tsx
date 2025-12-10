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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from './StatusBadge';
import { ReceiptPreviewDialog } from './ReceiptPreviewDialog';
import { ExpenseCardMobile } from './ExpenseCardMobile';
import { Expense } from '@/contexts/expense/types';
import { useIsMobile } from '@/hooks/use-mobile';
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
  Zap,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { memberService } from '@/contexts/auth/services/account/memberService';
import confetti from 'canvas-confetti';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  const isMobile = useIsMobile();
  const [selectedPendingExpenses, setSelectedPendingExpenses] = useState<string[]>([]);
  const [selectedApprovedExpenses, setSelectedApprovedExpenses] = useState<string[]>([]);
  const [isPerformingBulkAction, setIsPerformingBulkAction] = useState(false);
  const [previewReceiptId, setPreviewReceiptId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

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

  const toggleRowExpanded = (id: string) => {
    setExpandedRows(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const bulkApprove = async () => {
    if (selectedPendingExpenses.length === 0) return;

    setIsPerformingBulkAction(true);
    try {
      await Promise.all(selectedPendingExpenses.map(id => approveExpense(id)));
      
      // Celebration confetti
      const duration = 2000;
      const animationEnd = Date.now() + duration;
      const colors = ['#10B981', '#8B5CF6', '#EC4899'];

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: colors,
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: colors,
        });
      }, 50);

      toast.success(`🎉 אושרו ${selectedPendingExpenses.length} הוצאות בהצלחה!`);
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
      
      // Celebration confetti with gold colors
      const duration = 2500;
      const animationEnd = Date.now() + duration;
      const colors = ['#F59E0B', '#FBBF24', '#FCD34D'];

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        confetti({
          particleCount: 7,
          angle: 60,
          spread: 60,
          origin: { x: 0, y: 0.5 },
          colors: colors,
          ticks: 200,
        });
        confetti({
          particleCount: 7,
          angle: 120,
          spread: 60,
          origin: { x: 1, y: 0.5 },
          colors: colors,
          ticks: 200,
        });
      }, 40);

      toast.success(`💰 סומנו כשולם ${selectedApprovedExpenses.length} הוצאות בהצלחה!`);
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
      
      // Celebration confetti
      const duration = 2000;
      const animationEnd = Date.now() + duration;
      const colors = ['#10B981', '#8B5CF6', '#EC4899'];

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: colors,
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: colors,
        });
      }, 50);
      
      toast.success('🎉 ההוצאה אושרה בהצלחה!');
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
      
      // Celebration confetti with gold colors
      const duration = 2500;
      const animationEnd = Date.now() + duration;
      const colors = ['#F59E0B', '#FBBF24', '#FCD34D'];

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        confetti({
          particleCount: 7,
          angle: 60,
          spread: 60,
          origin: { x: 0, y: 0.5 },
          colors: colors,
          ticks: 200,
        });
        confetti({
          particleCount: 7,
          angle: 120,
          spread: 60,
          origin: { x: 1, y: 0.5 },
          colors: colors,
          ticks: 200,
        });
      }, 40);
      
      toast.success('💰 ההוצאה סומנה כשולמה!');
    } catch (error) {
      toast.error('שגיאה בסימון ההוצאה כשולמה');
    }
  };

  if (expenses.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/80 backdrop-blur-sm border border-border/50 shadow-lg animate-fade-in">
        <CardContent className="p-8 sm:p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-muted/30 rounded-full">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold">אין הוצאות להצגה</h3>
              <p className="text-sm sm:text-base text-muted-foreground">נסה לשנות את הפילטרים או להוסיף הוצאה חדשה</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card className="bg-gradient-to-br from-card/90 to-card/80 backdrop-blur-sm border border-border/50 shadow-lg animate-fade-in">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <span className="text-base sm:text-xl">הוצאות ({expenses.length})</span>
            </CardTitle>
            <CardDescription className="mt-1 text-xs sm:text-sm">
              ניהול ואישור הוצאות משותפות
            </CardDescription>
          </div>

          {/* Bulk Actions */}
          <div className="flex flex-col sm:flex-row gap-2">
            {pendingExpenses.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant={allPendingSelected ? "default" : "outline"}
                  size="sm"
                  onClick={toggleAllPending}
                  className="flex items-center gap-1.5 h-8 text-xs"
                >
                  {allPendingSelected ? <CheckSquare className="h-3 w-3" /> : <Square className="h-3 w-3" />}
                  <span className="hidden xs:inline">כל הממתינות</span>
                  <span className="xs:hidden">הכל</span>
                  ({pendingExpenses.length})
                </Button>
                {selectedPendingExpenses.length > 0 && (
                  <Button
                    onClick={bulkApprove}
                    disabled={isPerformingBulkAction}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                  >
                    <Check className="h-3 w-3 ml-1" />
                    אשר ({selectedPendingExpenses.length})
                  </Button>
                )}
              </div>
            )}

            {approvedExpenses.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant={allApprovedSelected ? "default" : "outline"}
                  size="sm"
                  onClick={toggleAllApproved}
                  className="flex items-center gap-1.5 h-8 text-xs"
                >
                  {allApprovedSelected ? <CheckSquare className="h-3 w-3" /> : <Square className="h-3 w-3" />}
                  <span className="hidden xs:inline">כל המאושרות</span>
                  <span className="xs:hidden">הכל</span>
                  ({approvedExpenses.length})
                </Button>
                {selectedApprovedExpenses.length > 0 && (
                  <Button
                    onClick={bulkMarkAsPaid}
                    disabled={isPerformingBulkAction}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs"
                  >
                    סמן כשולם ({selectedApprovedExpenses.length})
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Mobile: Card Layout */}
        {isMobile && (
          <div className="p-3 space-y-3">
            {expenses.map((expense, index) => {
              const creatorName = accountMembers?.find(m => m.user_id === expense.createdBy)?.user_name || 'לא ידוע';
              const paidByName = accountMembers?.find(m => m.user_id === expense.paidById)?.user_name || 'לא ידוע';
              const isSelected = expense.status === 'pending' 
                ? selectedPendingExpenses.includes(expense.id)
                : expense.status === 'approved'
                  ? selectedApprovedExpenses.includes(expense.id)
                  : false;
              
              return (
                <div
                  key={expense.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <ExpenseCardMobile
                    expense={expense}
                    creatorName={creatorName}
                    paidByName={paidByName}
                    isSelected={isSelected}
                    onSelect={(checked) => {
                      if (expense.status === 'pending') {
                        if (checked) {
                          setSelectedPendingExpenses([...selectedPendingExpenses, expense.id]);
                        } else {
                          setSelectedPendingExpenses(selectedPendingExpenses.filter(id => id !== expense.id));
                        }
                      } else if (expense.status === 'approved') {
                        if (checked) {
                          setSelectedApprovedExpenses([...selectedApprovedExpenses, expense.id]);
                        } else {
                          setSelectedApprovedExpenses(selectedApprovedExpenses.filter(id => id !== expense.id));
                        }
                      }
                    }}
                    onApprove={() => handleApprove(expense.id)}
                    onReject={() => handleReject(expense.id)}
                    onMarkAsPaid={() => handleMarkAsPaid(expense.id)}
                    onPreviewReceipt={expense.receiptId ? () => setPreviewReceiptId(expense.receiptId!) : undefined}
                    showCheckbox={expense.status === 'pending' || expense.status === 'approved'}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Desktop/Tablet: Compact Table Layout without horizontal scroll */}
        {!isMobile && (
          <div className="w-full">
            <Table dir="rtl" className="table-fixed w-full">
              <TableHeader>
                <TableRow className="bg-muted/30 border-b border-border/50">
                  <TableHead className="text-right font-semibold w-10 p-2"></TableHead>
                  <TableHead className="text-right font-semibold w-10 p-2">בחר</TableHead>
                  <TableHead className="text-right font-semibold w-20 p-2">תאריך</TableHead>
                  <TableHead className="text-right font-semibold p-2">תיאור</TableHead>
                  <TableHead className="text-right font-semibold w-24 p-2">סכום</TableHead>
                  <TableHead className="text-right font-semibold w-24 p-2">סטטוס</TableHead>
                  <TableHead className="text-right font-semibold w-32 p-2">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense, index) => {
                  const creatorName = accountMembers?.find(m => m.user_id === expense.createdBy)?.user_name || 'לא ידוע';
                  const paidByName = accountMembers?.find(m => m.user_id === expense.paidById)?.user_name || 'לא ידוע';
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

                        {/* Checkbox */}
                        <TableCell className="w-10 p-2">
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
                        
                        {/* Date */}
                        <TableCell className="w-20 p-2">
                          <span className="text-xs">{format(new Date(expense.date), 'dd/MM/yy')}</span>
                        </TableCell>
                        
                        {/* Description */}
                        <TableCell className="p-2">
                          <p className="font-medium truncate text-sm">{expense.description}</p>
                        </TableCell>
                        
                        {/* Amount */}
                        <TableCell className="w-24 p-2">
                          <span className="font-bold text-sm">₪{expense.amount}</span>
                        </TableCell>
                        
                        {/* Status */}
                        <TableCell className="w-24 p-2">
                          <StatusBadge status={expense.status} />
                        </TableCell>
                        
                        {/* Actions */}
                        <TableCell className="w-32 p-2">
                          <div className="flex gap-1 justify-end">
                            {expense.receiptId && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setPreviewReceiptId(expense.receiptId!)}
                                className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="תצוגה מקדימה"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {expense.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleApprove(expense.id)}
                                  className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  title="אשר"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleReject(expense.id)}
                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="דחה"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                            {expense.status === 'approved' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleMarkAsPaid(expense.id)}
                                className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                שולם
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded Details Row */}
                      {isExpanded && (
                        <TableRow className="bg-muted/10 border-b border-border/30">
                          <TableCell colSpan={7} className="p-3">
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
                                  <span className="text-muted-foreground text-xs">ילד:</span>
                                  <p className="font-medium">{expense.childName || 'כללי'}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <span className="text-muted-foreground text-xs">משלם:</span>
                                  <p className="font-medium">{paidByName}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <span className="text-muted-foreground text-xs">נוצר על ידי:</span>
                                  <p className="font-medium">{creatorName}</p>
                                </div>
                              </div>
                              {expense.splitEqually && (
                                <div className="col-span-2 md:col-span-4">
                                  <Badge variant="secondary" className="text-xs">
                                    חלוקה שווה
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
      </CardContent>
    </Card>

    <ReceiptPreviewDialog
      isOpen={!!previewReceiptId}
      onClose={() => setPreviewReceiptId(null)}
      receiptId={previewReceiptId || ''}
    />
    </>
  );
};
