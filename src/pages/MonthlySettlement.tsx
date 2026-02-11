import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useAuth } from '@/contexts/auth';
import { useExpense } from '@/contexts/ExpenseContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Calculator, CheckCircle, Clock, TrendingUp, RefreshCw, Check, DollarSign, Archive, ChevronDown, ChevronUp, FileText, Download, User, Receipt } from 'lucide-react';
import confetti from 'canvas-confetti';

const MonthlySettlement = () => {
  const { user, account, isLoading } = useAuth();
  const isPersonalPlan = account?.plan_slug === 'personal';
  const { expenses, isLoading: expensesLoading, refreshData, approveExpense, markAsPaid } = useExpense();
  const { toast } = useToast();
  
  // State for account members
  const [accountMembers, setAccountMembers] = useState<{user_id: string, user_name: string}[]>([]);
  
  // State for selected month/year
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  // State for collapsible sections
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    pending: false,
    approved: false,
    paid: false,
    rejected: false
  });


  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Load account members
  React.useEffect(() => {
    const loadAccountMembers = async () => {
      if (!account?.id) return;
      
      try {
        const { data, error } = await supabase
          .rpc('get_account_members_with_details', {
            account_uuid: account.id
          });
        
        if (error) throw error;
        setAccountMembers(data || []);
      } catch (error) {
        console.error('Error loading account members:', error);
      }
    };
    
    loadAccountMembers();
  }, [account?.id]);

  // Helper to get user name from ID
  const getUserName = (userId: string) => {
    const member = accountMembers.find(m => m.user_id === userId);
    return member?.user_name || 'לא ידוע';
  };
  
  // Generate arrays for selects
  const months = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
  
  // Calculate expenses data for selected month
  const monthlyData = useMemo(() => {
    const monthExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === selectedMonth && 
             expenseDate.getFullYear() === selectedYear;
    });
    
    const pending = monthExpenses.filter(e => e.status === 'pending');
    const approved = monthExpenses.filter(e => e.status === 'approved');
    const paid = monthExpenses.filter(e => e.status === 'paid');
    const rejected = monthExpenses.filter(e => e.status === 'rejected');
    
    return {
      total: monthExpenses.length,
      totalAmount: monthExpenses.reduce((sum, e) => sum + e.amount, 0),
      pending: {
        count: pending.length,
        amount: pending.reduce((sum, e) => sum + e.amount, 0),
        expenses: pending
      },
      approved: {
        count: approved.length,
        amount: approved.reduce((sum, e) => sum + e.amount, 0),
        expenses: approved
      },
      paid: {
        count: paid.length,
        amount: paid.reduce((sum, e) => sum + e.amount, 0),
        expenses: paid
      },
      rejected: {
        count: rejected.length,
        amount: rejected.reduce((sum, e) => sum + e.amount, 0),
        expenses: rejected
      }
    };
  }, [expenses, selectedMonth, selectedYear]);

  // Bulk action functions
  const handleApproveAll = async () => {
    try {
      const promises = monthlyData.pending.expenses.map(expense => approveExpense(expense.id));
      await Promise.all(promises);
      
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
      
      toast({
        title: "🎉 הצלחה!",
        description: `${monthlyData.pending.count} הוצאות אושרו בהצלחה`,
      });
      
      await refreshData();
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה באישור ההוצאות",
        variant: "destructive",
      });
    }
  };

  const handleMarkAllAsPaid = async () => {
    try {
      const promises = monthlyData.approved.expenses.map(expense => markAsPaid(expense.id));
      await Promise.all(promises);
      
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
      
      toast({
        title: "💰 הצלחה!",
        description: `${monthlyData.approved.count} הוצאות סומנו כשולמו`,
      });
      
      await refreshData();
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בסימון ההוצאות כשולמו",
        variant: "destructive",
      });
    }
  };

  const handleCloseMonth = async () => {
    try {
      // First approve all pending
      if (monthlyData.pending.count > 0) {
        const approvePromises = monthlyData.pending.expenses.map(expense => approveExpense(expense.id));
        await Promise.all(approvePromises);
      }
      
      // Wait a bit for the data to update
      await new Promise(resolve => setTimeout(resolve, 1000));
      await refreshData();
      
      // Then mark all approved as paid
      const allApproved = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === selectedMonth && 
               expenseDate.getFullYear() === selectedYear &&
               expense.status === 'approved';
      });
      
      if (allApproved.length > 0) {
        const paidPromises = allApproved.map(expense => markAsPaid(expense.id));
        await Promise.all(paidPromises);
      }
      
      // Epic celebration confetti for month close!
      const duration = 4000;
      const animationEnd = Date.now() + duration;
      const colors = ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6'];

      const epicConfetti = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          clearInterval(epicConfetti);
          return;
        }

        // Multiple bursts from different positions
        confetti({
          particleCount: 10,
          angle: 60,
          spread: 70,
          origin: { x: 0, y: 0.6 },
          colors: colors,
          ticks: 300,
        });
        confetti({
          particleCount: 10,
          angle: 120,
          spread: 70,
          origin: { x: 1, y: 0.6 },
          colors: colors,
          ticks: 300,
        });
        
        // Center burst
        if (Math.random() > 0.7) {
          confetti({
            particleCount: 15,
            spread: 360,
            origin: { x: 0.5, y: 0.5 },
            colors: colors,
            ticks: 250,
          });
        }
      }, 80);
      
      toast({
        title: "🎉 חודש נסגר בהצלחה!",
        description: `כל ההוצאות של ${months[selectedMonth]} ${selectedYear} סומנו כשולמו`,
      });
      
      await refreshData();
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בסגירת החודש",
        variant: "destructive",
      });
    }
  };

  if (isLoading || expensesLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">לא נבחר חשבון</h2>
          <p className="text-muted-foreground">יש לבחור חשבון כדי לבצע סגירת חודש</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30" dir="rtl">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-pulse [animation-delay:2s]"></div>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto py-4 sm:py-8 px-4 sm:px-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 sm:gap-6">
            <div className="space-y-1 sm:space-y-2">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl backdrop-blur-sm border border-primary/20">
                  <Calculator className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    סגירת חודש
                  </h1>
                  <p className="text-sm sm:text-base text-muted-foreground mt-1">
                    ניהול והסדרת הוצאות החודש
                  </p>
                </div>
              </div>
            </div>
            
            {/* Refresh Button */}
            <div className="flex gap-2 sm:gap-3">
              <Button
                variant="outline"
                onClick={refreshData}
                disabled={expensesLoading}
                size="sm"
                className="flex items-center gap-1 sm:gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${expensesLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">רענון</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Month/Year Selector - moved to top */}
        <div className="mb-4 sm:mb-6 flex justify-center">
          <div className="flex flex-col xs:flex-row items-center gap-2 xs:gap-4 p-3 sm:p-4 bg-card/80 backdrop-blur-sm rounded-lg border border-border/50 shadow-lg w-full xs:w-auto">
            <CalendarIcon className="h-5 w-5 text-primary hidden xs:block" />
            <div className="flex items-center gap-2 w-full xs:w-auto">
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                <SelectTrigger className="w-full xs:w-32 h-9 sm:h-10 text-sm">
                  <SelectValue placeholder="בחר חודש" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="w-full xs:w-24 h-9 sm:h-10 text-sm">
                  <SelectValue placeholder="שנה" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className={`grid grid-cols-2 ${isPersonalPlan ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-2 sm:gap-4 mb-4 sm:mb-6`}>
          {/* Pending Expenses - hidden for Personal plan */}
          {!isPersonalPlan && (
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-yellow-500/10 rounded-lg">
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">ממתינות לאישור</p>
                  <p className="text-base sm:text-lg font-bold">{monthlyData.pending.count}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">₪{monthlyData.pending.amount.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Approved Expenses */}
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">מאושרות</p>
                  <p className="text-base sm:text-lg font-bold">{monthlyData.approved.count}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">₪{monthlyData.approved.amount.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Paid Expenses */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-blue-500/10 rounded-lg">
                  <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">שולמו</p>
                  <p className="text-base sm:text-lg font-bold">{monthlyData.paid.count}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">₪{monthlyData.paid.amount.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Summary */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-purple-500/10 rounded-lg">
                  <Calculator className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">סה"כ החודש</p>
                  <p className="text-base sm:text-lg font-bold">{monthlyData.total}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">₪{monthlyData.totalAmount.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-card/90 to-card/80 backdrop-blur-lg border border-border/50 shadow-2xl">
            <CardHeader className="text-center px-3 sm:px-6">
              <CardTitle className="text-lg sm:text-2xl">סיכום חודש {months[selectedMonth]} {selectedYear}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                נתוני הוצאות מפורטים לחודש הנבחר
              </CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyData.total === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">אין הוצאות בחודש זה</p>
                  <p className="text-sm">בחר חודש אחר או הוסף הוצאות חדשות</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 sm:p-4 bg-muted/50 rounded-lg">
                    <h3 className="text-base sm:text-lg font-semibold mb-2">סיכום מהיר</h3>
                    <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                      <div>סה"כ הוצאות: <span className="font-bold">{monthlyData.total}</span></div>
                      <div>סה"כ סכום: <span className="font-bold">₪{monthlyData.totalAmount.toFixed(0)}</span></div>
                      <div>ממתינות לטיפול: <span className="font-bold text-yellow-600">{monthlyData.pending.count + monthlyData.approved.count}</span></div>
                      <div>הושלמו: <span className="font-bold text-green-600">{monthlyData.paid.count}</span></div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                    {/* Approve All Button - hidden for Personal plan */}
                    {!isPersonalPlan && monthlyData.pending.count > 0 && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white">
                            <Check className="ml-2 h-4 w-4" />
                            אשר הכל ({monthlyData.pending.count})
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>אישור כל ההוצאות הממתינות</AlertDialogTitle>
                            <AlertDialogDescription>
                              האם אתה בטוח שברצונך לאשר את כל {monthlyData.pending.count} ההוצאות הממתינות?
                              <br />
                              סכום כולל: ₪{monthlyData.pending.amount.toFixed(0)}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>ביטול</AlertDialogCancel>
                            <AlertDialogAction onClick={handleApproveAll}>
                              אשר הכל
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {/* Mark All as Paid Button */}
                    {monthlyData.approved.count > 0 && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                            <DollarSign className="ml-2 h-4 w-4" />
                            סמן הכל כשולם ({monthlyData.approved.count})
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>סימון כל ההוצאות כשולמו</AlertDialogTitle>
                            <AlertDialogDescription>
                              האם אתה בטוח שברצונך לסמן את כל {monthlyData.approved.count} ההוצאות המאושרות כשולמו?
                              <br />
                              סכום כולל: ₪{monthlyData.approved.amount.toFixed(0)}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>ביטול</AlertDialogCancel>
                            <AlertDialogAction onClick={handleMarkAllAsPaid}>
                              סמן הכל כשולם
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {/* Close Month Button */}
                    {(monthlyData.pending.count > 0 || monthlyData.approved.count > 0) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                            <Archive className="ml-2 h-4 w-4" />
                            סגור חודש
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>סגירת חודש {months[selectedMonth]} {selectedYear}</AlertDialogTitle>
                            <AlertDialogDescription>
                              פעולה זו תאשר את כל ההוצאות הממתינות ותסמן את כל ההוצאות כשולמו.
                              <br />
                              <br />
                              <strong>סיכום:</strong>
                              <br />
                              • הוצאות ממתינות לאישור: {monthlyData.pending.count} (₪{monthlyData.pending.amount.toFixed(0)})
                              <br />
                              • הוצאות ממתינות לתשלום: {monthlyData.approved.count} (₪{monthlyData.approved.amount.toFixed(0)})
                              <br />
                              <br />
                              <strong>סה"כ לטיפול: ₪{(monthlyData.pending.amount + monthlyData.approved.amount).toFixed(0)}</strong>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>ביטול</AlertDialogCancel>
                            <AlertDialogAction onClick={handleCloseMonth} className="bg-purple-600 hover:bg-purple-700">
                              סגור חודש
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">התקדמות סגירת החודש</span>
                      <span className="text-xs text-muted-foreground">
                        {monthlyData.paid.count} מתוך {monthlyData.total} הושלמו
                      </span>
                    </div>
                    <Progress 
                      value={monthlyData.total > 0 ? (monthlyData.paid.count / monthlyData.total) * 100 : 0} 
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {monthlyData.total > 0 ? Math.round((monthlyData.paid.count / monthlyData.total) * 100) : 0}% הושלם
                    </p>
                  </div>

                  {/* Detailed Expense Lists */}
                  <div className="space-y-3">
                    {/* Pending Expenses */}
                    {monthlyData.pending.count > 0 && (
                      <Collapsible open={expandedSections.pending} onOpenChange={() => toggleSection('pending')}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-between p-2.5 sm:p-3 h-auto bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800">
                            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-600 flex-shrink-0" />
                              <span className="font-medium text-xs sm:text-sm truncate">ממתינות ({monthlyData.pending.count})</span>
                              <Badge variant="secondary" className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 text-[10px] sm:text-xs flex-shrink-0">
                                ₪{monthlyData.pending.amount.toFixed(0)}
                              </Badge>
                            </div>
                            {expandedSections.pending ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="space-y-2 bg-yellow-50/50 dark:bg-yellow-900/10 p-3 rounded-lg border border-yellow-200/50 dark:border-yellow-800/50">
                            {monthlyData.pending.expenses.map((expense) => (
                              <div key={expense.id} className="flex flex-col xs:flex-row xs:items-center justify-between p-2.5 sm:p-3 bg-background/80 rounded-lg border border-border/50 gap-1.5 xs:gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm truncate">{expense.description}</span>
                                    {expense.receipt && <Receipt className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] sm:text-xs text-muted-foreground">
                                    <span>{format(new Date(expense.date), 'dd/MM', { locale: he })}</span>
                                    <span>{expense.category}</span>
                                    {expense.childName && (
                                      <div className="flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        {expense.childName}
                                      </div>
                                    )}
                                    <span className="hidden sm:inline">נוצר ע"י {getUserName(expense.createdBy)}</span>
                                  </div>
                                </div>
                                <div className="text-left flex-shrink-0">
                                  <div className="font-bold text-yellow-700 dark:text-yellow-300 text-sm sm:text-base">₪{expense.amount.toFixed(0)}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Approved Expenses */}
                    {monthlyData.approved.count > 0 && (
                      <Collapsible open={expandedSections.approved} onOpenChange={() => toggleSection('approved')}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-between p-2.5 sm:p-3 h-auto bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                              <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                              <span className="font-medium text-xs sm:text-sm truncate">מאושרות ({monthlyData.approved.count})</span>
                              <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 text-[10px] sm:text-xs flex-shrink-0">
                                ₪{monthlyData.approved.amount.toFixed(0)}
                              </Badge>
                            </div>
                            {expandedSections.approved ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="space-y-2 bg-green-50/50 dark:bg-green-900/10 p-3 rounded-lg border border-green-200/50 dark:border-green-800/50">
                            {monthlyData.approved.expenses.map((expense) => (
                              <div key={expense.id} className="flex flex-col xs:flex-row xs:items-center justify-between p-2.5 sm:p-3 bg-background/80 rounded-lg border border-border/50 gap-1.5 xs:gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm truncate">{expense.description}</span>
                                    {expense.receipt && <Receipt className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] sm:text-xs text-muted-foreground">
                                    <span>{format(new Date(expense.date), 'dd/MM', { locale: he })}</span>
                                    <span>{expense.category}</span>
                                    {expense.childName && (
                                      <div className="flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        {expense.childName}
                                      </div>
                                    )}
                                    <span className="hidden sm:inline">נוצר ע"י {getUserName(expense.createdBy)}</span>
                                    {expense.approvedBy && <span className="hidden sm:inline">אושר ע"י {getUserName(expense.approvedBy)}</span>}
                                  </div>
                                </div>
                                <div className="text-left flex-shrink-0">
                                  <div className="font-bold text-green-700 dark:text-green-300 text-sm sm:text-base">₪{expense.amount.toFixed(0)}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Paid Expenses */}
                    {monthlyData.paid.count > 0 && (
                      <Collapsible open={expandedSections.paid} onOpenChange={() => toggleSection('paid')}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-between p-2.5 sm:p-3 h-auto bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
                              <span className="font-medium text-xs sm:text-sm truncate">שולמו ({monthlyData.paid.count})</span>
                              <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 text-[10px] sm:text-xs flex-shrink-0">
                                ₪{monthlyData.paid.amount.toFixed(0)}
                              </Badge>
                            </div>
                            {expandedSections.paid ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="space-y-2 bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                            {monthlyData.paid.expenses.map((expense) => (
                              <div key={expense.id} className="flex flex-col xs:flex-row xs:items-center justify-between p-2.5 sm:p-3 bg-background/80 rounded-lg border border-border/50 gap-1.5 xs:gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm truncate">{expense.description}</span>
                                    {expense.receipt && <Receipt className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] sm:text-xs text-muted-foreground">
                                    <span>{format(new Date(expense.date), 'dd/MM', { locale: he })}</span>
                                    <span>{expense.category}</span>
                                    {expense.childName && (
                                      <div className="flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        {expense.childName}
                                      </div>
                                    )}
                                    <span className="hidden sm:inline">נוצר ע"י {getUserName(expense.createdBy)}</span>
                                  </div>
                                </div>
                                <div className="text-left flex-shrink-0">
                                  <div className="font-bold text-blue-700 dark:text-blue-300 text-sm sm:text-base">₪{expense.amount.toFixed(0)}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>

                  {/* Export Button */}
                  {monthlyData.total > 0 && (
                    <div className="pt-4 border-t border-border/50">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          const data = {
                            month: months[selectedMonth],
                            year: selectedYear,
                            summary: monthlyData,
                            expenses: expenses.filter(expense => {
                              const expenseDate = new Date(expense.date);
                              return expenseDate.getMonth() === selectedMonth && 
                                     expenseDate.getFullYear() === selectedYear;
                            })
                          };
                          
                          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `monthly-settlement-${selectedYear}-${selectedMonth + 1}.json`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                          
                          toast({
                            title: "הצלחה!",
                            description: "הקובץ הורד בהצלחה",
                          });
                        }}
                      >
                        <Download className="ml-2 h-4 w-4" />
                        ייצא נתונים לקובץ
                      </Button>
                    </div>
                  )}

                  {/* Success Message */}
                  {monthlyData.pending.count === 0 && monthlyData.approved.count === 0 && monthlyData.paid.count > 0 && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
                      <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <h4 className="text-lg font-semibold text-green-800 dark:text-green-200">
                        חודש {months[selectedMonth]} {selectedYear} נסגר בהצלחה!
                      </h4>
                      <p className="text-sm text-green-600 dark:text-green-300 mt-1">
                        כל ההוצאות שולמו והחודש הושלם
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MonthlySettlement;