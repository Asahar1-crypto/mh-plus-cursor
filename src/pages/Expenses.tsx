
import React, { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Filter, User, FileText, ScanLine, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useExpense } from '@/contexts/ExpenseContext';
import { Expense } from '@/contexts/expense/types';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';

// Status badge components for consistent styling
const StatusBadge: React.FC<{ status: Expense['status'] }> = ({ status }) => {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">ממתינה לאישור</Badge>;
    case 'approved':
      return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">אושרה</Badge>;
    case 'rejected':
      return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">נדחתה</Badge>;
    case 'paid':
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">שולמה</Badge>;
    default:
      return null;
  }
};

const ExpensesPage = () => {
  const { 
    expenses, 
    childrenList, 
    approveExpense, 
    rejectExpense, 
    markAsPaid 
  } = useExpense();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isManualForm, setIsManualForm] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<Expense['status'] | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Filter expenses based on selected criteria
  const filteredExpenses = expenses
    .filter(expense => selectedCategory ? expense.category === selectedCategory : true)
    .filter(expense => selectedChild ? expense.childId === selectedChild : true)
    .filter(expense => selectedStatus ? expense.status === selectedStatus : true)
    .filter(expense => {
      if (selectedMonth !== null && selectedYear !== null) {
        const expenseDate = new Date(expense.date);
        return (
          expenseDate.getMonth() === selectedMonth && 
          expenseDate.getFullYear() === selectedYear
        );
      }
      return true;
    });

  // Categories for filtering
  const categories = [
    'חינוך',
    'רפואה',
    'פנאי',
    'ביגוד',
    'מזון',
    'אחר',
  ];

  // Generate months for dropdown
  const months = [
    { value: 0, label: 'ינואר' },
    { value: 1, label: 'פברואר' },
    { value: 2, label: 'מרץ' },
    { value: 3, label: 'אפריל' },
    { value: 4, label: 'מאי' },
    { value: 5, label: 'יוני' },
    { value: 6, label: 'יולי' },
    { value: 7, label: 'אוגוסט' },
    { value: 8, label: 'ספטמבר' },
    { value: 9, label: 'אוקטובר' },
    { value: 10, label: 'נובמבר' },
    { value: 11, label: 'דצמבר' },
  ];

  // Current year and few years back for filtering
  const years = [
    new Date().getFullYear(),
    new Date().getFullYear() - 1,
    new Date().getFullYear() - 2
  ];

  const handleAddExpenseClick = (isManual: boolean) => {
    setIsManualForm(isManual);
    setIsAddDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">ניהול הוצאות משותפות</h1>
          <p className="text-muted-foreground">צפייה, הוספה ואישור של הוצאות משותפות</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="mt-4 md:mt-0">
              <PlusCircle className="mr-2 h-4 w-4" /> הוצאה חדשה
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {isManualForm ? "הוספת הוצאה ידנית" : "סריקת חשבונית"}
              </DialogTitle>
              <DialogDescription>
                {isManualForm 
                  ? "הזן את פרטי ההוצאה החדשה" 
                  : "העלה קובץ חשבונית לסריקה אוטומטית"}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex gap-4 mb-4">
              <Button 
                variant={isManualForm ? "default" : "outline"} 
                onClick={() => setIsManualForm(true)}
                className="flex-1"
              >
                <FileText className="mr-2 h-4 w-4" /> הזנה ידנית
              </Button>
              <Button 
                variant={!isManualForm ? "default" : "outline"} 
                onClick={() => setIsManualForm(false)}
                className="flex-1"
              >
                <ScanLine className="mr-2 h-4 w-4" /> סריקת חשבונית
              </Button>
            </div>
            
            {isManualForm ? (
              <ExpenseForm onSubmitSuccess={() => setIsAddDialogOpen(false)} />
            ) : (
              <div className="text-center py-8">
                <ScanLine className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <p>פונקציונליות סריקת חשבוניות תהיה זמינה בקרוב</p>
                <Button 
                  onClick={() => setIsManualForm(true)} 
                  variant="outline" 
                  className="mt-4"
                >
                  חזרה להזנה ידנית
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        {/* Filtering options */}
        <Card className="bg-muted/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Filter className="mr-2 h-5 w-5" /> סינון הוצאות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">לפי חודש</label>
                <div className="flex gap-2">
                  <Select 
                    value={selectedMonth?.toString()} 
                    onValueChange={(value) => setSelectedMonth(Number(value))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={months[new Date().getMonth()].label} />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value.toString()}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select 
                    value={selectedYear?.toString()} 
                    onValueChange={(value) => setSelectedYear(Number(value))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={new Date().getFullYear().toString()} />
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

              <div className="space-y-2">
                <label className="text-sm font-medium">לפי קטגוריה</label>
                <Select 
                  value={selectedCategory || ''} 
                  onValueChange={(value) => setSelectedCategory(value || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="כל הקטגוריות" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">הכל</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">לפי סטטוס</label>
                <Select 
                  value={selectedStatus || ''} 
                  onValueChange={(value) => setSelectedStatus(value as Expense['status'] || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="כל הסטטוסים" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">הכל</SelectItem>
                    <SelectItem value="pending">ממתינה לאישור</SelectItem>
                    <SelectItem value="approved">אושרה</SelectItem>
                    <SelectItem value="rejected">נדחתה</SelectItem>
                    <SelectItem value="paid">שולמה</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">לפי שיוך לילד</label>
                <Select 
                  value={selectedChild || ''} 
                  onValueChange={(value) => setSelectedChild(value || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="כל הילדים" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">הכל</SelectItem>
                    <SelectItem value="general">הוצאה כללית</SelectItem>
                    {childrenList.map((child) => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Table */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-xl">רשימת הוצאות</CardTitle>
            <CardDescription>סה״כ {filteredExpenses.length} הוצאות</CardDescription>
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
                  {filteredExpenses.length > 0 ? (
                    filteredExpenses.map((expense) => (
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
                                  onClick={() => approveExpense(expense.id)}
                                  className="text-green-600 hover:text-green-800 hover:bg-green-50 h-7 px-2"
                                >
                                  אישור
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => rejectExpense(expense.id)}
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
                                onClick={() => markAsPaid(expense.id)}
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
      </div>
    </div>
  );
};

export default ExpensesPage;
