import React, { useState, useEffect, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import { StatusBadge } from './StatusBadge';
import { ReceiptPreviewDialog } from './ReceiptPreviewDialog';
import { ExpenseCardMobile } from './ExpenseCardMobile';
import { Expense } from '@/contexts/expense/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import {
  Check,
  X,
  Pencil,
  Copy,
  Trash2,
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
  ChevronUp,
  Search,
  Repeat
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { memberService } from '@/contexts/auth/services/account/memberService';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EditExpenseModal } from './EditExpenseModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, ChevronLeft } from 'lucide-react';
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

interface ExpensesTableProps {
  expenses: Expense[];
  approveExpense: (id: string) => Promise<void>;
  approveAllRecurring: (id: string) => Promise<void>;
  rejectExpense: (id: string) => Promise<void>;
  markAsPaid: (id: string) => Promise<void>;
  updateExpense: (id: string, updates: Partial<Pick<Expense, 'amount' | 'description' | 'date' | 'category' | 'childId' | 'paidById' | 'splitEqually'>>) => Promise<void>;
  updateExpenseStatus: (id: string, status: Expense['status']) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
  isSuperAdmin?: boolean;
  onDuplicateExpense?: (expense: Expense) => Promise<void>;
  recurringTemplates?: Expense[];
}

export const ExpensesTable: React.FC<ExpensesTableProps> = ({
  expenses,
  approveExpense,
  approveAllRecurring,
  rejectExpense,
  markAsPaid,
  updateExpense,
  updateExpenseStatus,
  deleteExpense,
  refreshData,
  isSuperAdmin = false,
  onDuplicateExpense,
  recurringTemplates = [],
}) => {
  const { account } = useAuth();
  const isMobile = useIsMobile();
  const [selectedPendingExpenses, setSelectedPendingExpenses] = useState<string[]>([]);
  const [selectedApprovedExpenses, setSelectedApprovedExpenses] = useState<string[]>([]);
  const [isPerformingBulkAction, setIsPerformingBulkAction] = useState(false);
  const [previewReceiptId, setPreviewReceiptId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [recurringApproveDialogOpen, setRecurringApproveDialogOpen] = useState(false);
  const [expenseToApproveId, setExpenseToApproveId] = useState<string | null>(null);
  const [approveDialogTemplate, setApproveDialogTemplate] = useState<Expense | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

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

  // Pagination: reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredExpenses.length, searchQuery]);

  const totalPages = Math.ceil(filteredExpenses.length / pageSize) || 1;
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredExpenses.slice(start, start + pageSize);
  }, [filteredExpenses, currentPage, pageSize]);

  const startItem = filteredExpenses.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, filteredExpenses.length);

  const isPersonalPlan = account?.plan_slug === 'personal';
  const pendingExpenses = filteredExpenses.filter(expense => expense.status === 'pending');
  const approvedExpenses = filteredExpenses.filter(expense => expense.status === 'approved');

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
      const confetti = (await import('canvas-confetti')).default;
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
      toast.error('שגיאה באישור ההוצאות — נסה שוב');
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
      const confetti = (await import('canvas-confetti')).default;
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
      toast.error('שגיאה בסימון ההוצאות כשולמות — נסה שוב');
    } finally {
      setIsPerformingBulkAction(false);
    }
  };

  const bulkDelete = async () => {
    const allSelected = [...selectedPendingExpenses, ...selectedApprovedExpenses];
    if (allSelected.length === 0) return;

    setIsPerformingBulkAction(true);
    try {
      await Promise.all(allSelected.map(id => deleteExpense(id)));
      toast.success(`נמחקו ${allSelected.length} הוצאות`);
      setSelectedPendingExpenses([]);
      setSelectedApprovedExpenses([]);
    } catch (error) {
      toast.error('שגיאה במחיקת ההוצאות');
    } finally {
      setIsPerformingBulkAction(false);
      setBulkDeleteDialogOpen(false);
    }
  };

  const fireApproveConfetti = async () => {
    const confetti = (await import('canvas-confetti')).default;
    const duration = 2000;
    const animationEnd = Date.now() + duration;
    const colors = ['#10B981', '#8B5CF6', '#EC4899'];
    const interval = setInterval(() => {
      if (Date.now() >= animationEnd) { clearInterval(interval); return; }
      confetti({ particleCount: 5, angle: 60,  spread: 55, origin: { x: 0, y: 0.6 }, colors });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors });
    }, 50);
  };

  const handleApprove = (id: string) => {
    const expense = filteredExpenses.find(e => e.id === id);
    if (expense?.recurringParentId) {
      const template = recurringTemplates.find(t => t.id === expense.recurringParentId) ?? null;
      setExpenseToApproveId(id);
      setApproveDialogTemplate(template);
      setRecurringApproveDialogOpen(true);
    } else {
      handleApproveOnce(id);
    }
  };

  const handleApproveOnce = async (id?: string) => {
    const targetId = id ?? expenseToApproveId;
    if (!targetId) return;
    setRecurringApproveDialogOpen(false);
    setExpenseToApproveId(null);
    setApproveDialogTemplate(null);
    try {
      await approveExpense(targetId);
      fireApproveConfetti();
    } catch (error) {
      toast.error('שגיאה באישור ההוצאה — נסה שוב');
    }
  };

  const handleApproveAllRecurring = async (id?: string) => {
    const targetId = id ?? expenseToApproveId;
    if (!targetId) return;
    setRecurringApproveDialogOpen(false);
    setExpenseToApproveId(null);
    setApproveDialogTemplate(null);
    try {
      await approveAllRecurring(targetId);
      
      // Extra celebration confetti for recurring approval
      const confetti = (await import('canvas-confetti')).default;
      const duration = 2500;
      const animationEnd = Date.now() + duration;
      const colors = ['#10B981', '#8B5CF6', '#EC4899', '#F59E0B'];

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        confetti({
          particleCount: 8,
          angle: 60,
          spread: 70,
          origin: { x: 0, y: 0.5 },
          colors: colors,
        });
        confetti({
          particleCount: 8,
          angle: 120,
          spread: 70,
          origin: { x: 1, y: 0.5 },
          colors: colors,
        });
      }, 40);
      
    } catch (error) {
      toast.error('שגיאה באישור ההוצאות החוזרות — נסה שוב');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectExpense(id);
    } catch (error) {
      toast.error('שגיאה בדחיית ההוצאה — נסה שוב');
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      await markAsPaid(id);
      
      // Celebration confetti with gold colors
      const confetti = (await import('canvas-confetti')).default;
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

    } catch (error) {
      toast.error('שגיאה בסימון ההוצאה כשולמה — נסה שוב');
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <div className="p-1.5 sm:p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <span className="text-base sm:text-xl">הוצאות ({filteredExpenses.length}{searchQuery && ` מתוך ${expenses.length}`})</span>
              </CardTitle>
              <CardDescription className="mt-1 text-xs sm:text-sm">
                {isPersonalPlan ? 'ניהול הוצאות' : 'ניהול ואישור הוצאות משותפות'}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש הוצאות..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9 h-9 text-sm"
              />
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="flex flex-col sm:flex-row gap-2">
            {!isPersonalPlan && pendingExpenses.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant={allPendingSelected ? "default" : "outline"}
                  size="sm"
                  onClick={toggleAllPending}
                  className="flex items-center gap-1.5 h-10 sm:h-8 text-xs"
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
                    className="bg-green-600 hover:bg-green-700 text-white h-10 sm:h-8 text-xs"
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
                  className="flex items-center gap-1.5 h-10 sm:h-8 text-xs"
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
                    className="bg-blue-600 hover:bg-blue-700 text-white h-10 sm:h-8 text-xs"
                  >
                    סמן כשולם ({selectedApprovedExpenses.length})
                  </Button>
                )}
              </div>
            )}

            {isSuperAdmin && (selectedPendingExpenses.length + selectedApprovedExpenses.length) > 0 && (
              <Button
                onClick={() => setBulkDeleteDialogOpen(true)}
                disabled={isPerformingBulkAction}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white h-10 sm:h-8 text-xs"
              >
                <Trash2 className="h-3 w-3 ml-1" />
                מחק נבחרים ({selectedPendingExpenses.length + selectedApprovedExpenses.length})
              </Button>
            )}
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

        {/* Mobile: Card Layout */}
        {isMobile && filteredExpenses.length > 0 && (
          <div className="p-3 space-y-3">
            {paginatedExpenses.map((expense, index) => {
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
                    isPersonalPlan={isPersonalPlan}
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
                    onEdit={!expense.isRecurring ? () => { setEditingExpense(expense); setEditModalOpen(true); } : undefined}
                    onDelete={isSuperAdmin ? () => { setExpenseToDelete(expense); setDeleteDialogOpen(true); } : undefined}
                    onUpdateStatus={isSuperAdmin ? (status) => updateExpenseStatus(expense.id, status) : undefined}
                    showCheckbox={expense.status === 'pending' || expense.status === 'approved'}
                    isSuperAdmin={isSuperAdmin}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Desktop/Tablet: Compact Table Layout */}
        {!isMobile && filteredExpenses.length > 0 && (
          <div className="w-full overflow-x-auto -mx-2 px-2 md:mx-0 md:px-0">
            <Table dir="rtl" className="table-fixed w-full min-w-[600px]">
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
                {paginatedExpenses.map((expense, index) => {
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
                          {!isPersonalPlan && expense.status === 'pending' && (
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
                          {isSuperAdmin ? (
                            <Select
                              value={expense.status}
                              onValueChange={(v) => updateExpenseStatus(expense.id, v as Expense['status'])}
                            >
                              <SelectTrigger className="h-7 text-xs w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">ממתין</SelectItem>
                                <SelectItem value="approved">מאושר</SelectItem>
                                <SelectItem value="rejected">נדחה</SelectItem>
                                <SelectItem value="paid">שולם</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <StatusBadge status={expense.status} />
                          )}
                        </TableCell>
                        
                        {/* Actions */}
                        <TableCell className="w-32 p-2">
                          <div className="flex gap-1 justify-end">
                            {!expense.isRecurring && (expense.status === 'pending' || expense.status === 'approved') && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingExpense(expense);
                                  setEditModalOpen(true);
                                }}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                title="ערוך"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {onDuplicateExpense && !expense.isRecurring && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onDuplicateExpense(expense)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                                title="שכפל הוצאה"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            )}
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
                            {!isPersonalPlan && expense.status === 'pending' && (
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
                            {isSuperAdmin && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setExpenseToDelete(expense); setDeleteDialogOpen(true); }}
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="מחק הוצאה"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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

        {/* Pagination */}
        {filteredExpenses.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border/50 bg-muted/10">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                מציג {startItem}-{endItem} מתוך {filteredExpenses.length}
              </span>
              <Select
                value={pageSize.toString()}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-20 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">לעמוד</span>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-10 w-10 sm:h-8 sm:w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="text-sm px-2 min-w-[60px] text-center">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-10 w-10 sm:h-8 sm:w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>

    <ReceiptPreviewDialog
      isOpen={!!previewReceiptId}
      onClose={() => setPreviewReceiptId(null)}
      receiptId={previewReceiptId || ''}
    />

    <EditExpenseModal
      expense={editingExpense}
      open={editModalOpen}
      onOpenChange={(open) => {
        setEditModalOpen(open);
        if (!open) setEditingExpense(null);
      }}
      onSuccess={refreshData}
    />

    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>מחיקת הוצאה</AlertDialogTitle>
          <AlertDialogDescription>
            {expenseToDelete && (
              <>האם למחוק את ההוצאה &quot;{expenseToDelete.description}&quot; (₪{expenseToDelete.amount})? פעולה זו לא ניתנת לביטול.</>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ביטול</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={async () => {
              if (expenseToDelete) {
                await deleteExpense(expenseToDelete.id);
                setDeleteDialogOpen(false);
                setExpenseToDelete(null);
              }
            }}
          >
            מחק
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>מחיקת הוצאות נבחרות</AlertDialogTitle>
          <AlertDialogDescription>
            האם למחוק {selectedPendingExpenses.length + selectedApprovedExpenses.length} הוצאות נבחרות? פעולה זו אינה ניתנת לביטול.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ביטול</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={bulkDelete}
          >
            מחק הכל
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* ── Recurring approval dialog ─────────────────────────────── */}
    <AlertDialog open={recurringApproveDialogOpen} onOpenChange={setRecurringApproveDialogOpen}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-purple-600" />
            אישור הוצאה חוזרת
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>הוצאה זו מתחדשת מדי חודש. כיצד תרצה לאשר אותה?</p>
              {approveDialogTemplate?.hasEndDate && approveDialogTemplate.endDate ? (
                <p className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  תוקף ההוצאה עד: {format(new Date(approveDialogTemplate.endDate), 'dd/MM/yyyy')}
                </p>
              ) : (
                <p className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  ללא הגבלת זמן
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <AlertDialogAction
            onClick={() => handleApproveAllRecurring()}
            className="bg-purple-600 hover:bg-purple-700 text-white w-full"
          >
            <Repeat className="h-4 w-4 ml-2" />
            חודש זה וכל החודשים הבאים
          </AlertDialogAction>
          <AlertDialogAction
            onClick={() => handleApproveOnce()}
            className="bg-green-600 hover:bg-green-700 text-white w-full"
          >
            <Check className="h-4 w-4 ml-2" />
            חודש זה בלבד
          </AlertDialogAction>
          <AlertDialogCancel className="w-full mt-0">ביטול</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};
