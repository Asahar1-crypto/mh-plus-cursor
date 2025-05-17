
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useExpense, Expense } from '@/contexts/ExpenseContext';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, Clock, CreditCard, Plus, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ExpenseCard: React.FC<{ expense: Expense; onApprove?: () => void; onReject?: () => void; onMarkPaid?: () => void }> = ({ 
  expense, 
  onApprove, 
  onReject,
  onMarkPaid
}) => {
  return (
    <Card className="mb-4 overflow-hidden">
      <div className="flex border-b border-border p-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium">{expense.description}</h3>
            {expense.isRecurring && (
              <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded">קבוע</span>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {expense.childName && <span>{expense.childName} | </span>}
            <span>{expense.category}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold">₪{expense.amount.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">{expense.date}</div>
        </div>
      </div>
      <div className="flex items-center justify-between p-2 bg-muted/20">
        <div className="text-sm text-muted-foreground">
          {expense.creatorName}
        </div>
        <div className="flex items-center gap-2">
          {expense.status === 'pending' && (
            <>
              <Button variant="ghost" size="sm" onClick={onReject} className="text-red-500 h-8">
                <XCircle className="h-4 w-4 mr-1" />
                <span>דחה</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={onApprove} className="text-green-500 h-8">
                <CheckCircle className="h-4 w-4 mr-1" />
                <span>אשר</span>
              </Button>
            </>
          )}
          {expense.status === 'approved' && (
            <Button variant="outline" size="sm" onClick={onMarkPaid} className="h-8">
              <CreditCard className="h-4 w-4 mr-1" />
              <span>סמן כשולם</span>
            </Button>
          )}
          {expense.status === 'rejected' && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
              נדחה
            </span>
          )}
          {expense.status === 'paid' && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
              שולם
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const { 
    expenses, 
    getPendingExpenses, 
    getApprovedExpenses, 
    getPaidExpenses, 
    getTotalPending,
    getTotalApproved,
    approveExpense,
    rejectExpense,
    markAsPaid
  } = useExpense();
  const navigate = useNavigate();

  const pendingExpenses = getPendingExpenses();
  const approvedExpenses = getApprovedExpenses();
  const paidExpenses = getPaidExpenses();
  
  const pendingTotal = getTotalPending();
  const approvedTotal = getTotalApproved();
  
  return (
    <div className="container mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">שלום, {user?.name || 'משתמש'}</h1>
          <p className="text-muted-foreground">ברוכים הבאים למערכת הניהול שלך</p>
        </div>
        <Button 
          onClick={() => navigate('/add-expense')}
          className="mt-4 md:mt-0"
        >
          <Plus className="mr-2 h-4 w-4" /> הוספת הוצאה
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>הוצאות ממתינות</CardDescription>
            <CardTitle className="text-2xl">₪{pendingTotal.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Clock className="mr-2 h-5 w-5 text-amber-500" />
              <span className="text-sm text-muted-foreground">{pendingExpenses.length} הוצאות ממתינות לאישור</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>הוצאות מאושרות</CardDescription>
            <CardTitle className="text-2xl">₪{approvedTotal.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">{approvedExpenses.length} הוצאות מאושרות לתשלום</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>הוצאות ששולמו החודש</CardDescription>
            <CardTitle className="text-2xl">₪{paidExpenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">{paidExpenses.length} הוצאות שולמו</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="pending" className="flex-1">ממתינות ({pendingExpenses.length})</TabsTrigger>
          <TabsTrigger value="approved" className="flex-1">מאושרות ({approvedExpenses.length})</TabsTrigger>
          <TabsTrigger value="paid" className="flex-1">שולמו ({paidExpenses.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending">
          {pendingExpenses.length > 0 ? (
            pendingExpenses.map((expense) => (
              <ExpenseCard 
                key={expense.id} 
                expense={expense} 
                onApprove={() => approveExpense(expense.id)}
                onReject={() => rejectExpense(expense.id)}
              />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              אין הוצאות ממתינות לאישור
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="approved">
          {approvedExpenses.length > 0 ? (
            approvedExpenses.map((expense) => (
              <ExpenseCard 
                key={expense.id} 
                expense={expense} 
                onMarkPaid={() => markAsPaid(expense.id)}
              />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              אין הוצאות מאושרות
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="paid">
          {paidExpenses.length > 0 ? (
            paidExpenses.map((expense) => (
              <ExpenseCard key={expense.id} expense={expense} />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              אין הוצאות ששולמו
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
