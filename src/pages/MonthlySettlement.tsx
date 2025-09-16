import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useAuth } from '@/contexts/auth';
import { useExpense } from '@/contexts/ExpenseContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Calculator, CheckCircle, Clock, TrendingUp, RefreshCw, Check, DollarSign, Archive } from 'lucide-react';

const MonthlySettlement = () => {
  const { user, account, isLoading } = useAuth();
  const { expenses, isLoading: expensesLoading, refreshData, approveExpense, markAsPaid } = useExpense();
  const { toast } = useToast();
  
  // State for selected month/year
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
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
      
      toast({
        title: "הצלחה!",
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
      
      toast({
        title: "הצלחה!",
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
      
      toast({
        title: "חודש נסגר בהצלחה!",
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
        <div className="mb-6 flex justify-center">
          <div className="flex items-center gap-4 p-4 bg-card/80 backdrop-blur-sm rounded-lg border border-border/50 shadow-lg">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <div className="flex items-center gap-2">
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                <SelectTrigger className="w-32">
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
                <SelectTrigger className="w-24">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Pending Expenses */}
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">ממתינות לאישור</p>
                  <p className="text-lg font-bold">{monthlyData.pending.count}</p>
                  <p className="text-xs text-muted-foreground">₪{monthlyData.pending.amount.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Approved Expenses */}
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">מאושרות - ממתינות לתשלום</p>
                  <p className="text-lg font-bold">{monthlyData.approved.count}</p>
                  <p className="text-xs text-muted-foreground">₪{monthlyData.approved.amount.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Paid Expenses */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">שולמו</p>
                  <p className="text-lg font-bold">{monthlyData.paid.count}</p>
                  <p className="text-xs text-muted-foreground">₪{monthlyData.paid.amount.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Summary */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Calculator className="h-4 w-4 text-purple-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">סה"כ החודש</p>
                  <p className="text-lg font-bold">{monthlyData.total}</p>
                  <p className="text-xs text-muted-foreground">₪{monthlyData.totalAmount.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-card/90 to-card/80 backdrop-blur-lg border border-border/50 shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">סיכום חודש {months[selectedMonth]} {selectedYear}</CardTitle>
              <CardDescription>
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
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">סיכום מהיר</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>סה"כ הוצאות: <span className="font-bold">{monthlyData.total}</span></div>
                      <div>סה"כ סכום: <span className="font-bold">₪{monthlyData.totalAmount.toFixed(0)}</span></div>
                      <div>ממתינות לטיפול: <span className="font-bold text-yellow-600">{monthlyData.pending.count + monthlyData.approved.count}</span></div>
                      <div>הושלמו: <span className="font-bold text-green-600">{monthlyData.paid.count}</span></div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Approve All Button */}
                    {monthlyData.pending.count > 0 && (
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