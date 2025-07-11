import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useExpense } from '@/contexts/ExpenseContext';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { memberService } from '@/contexts/auth/services/account/memberService';
import { Separator } from '@/components/ui/separator';

interface PaymentBreakdown {
  userId: string;
  userName: string;
  totalPaid: number;
  shouldPay: number;
  balance: number; // positive = needs to pay more, negative = overpaid
}

export const MonthlyFoodPaymentCard: React.FC = () => {
  const { expenses } = useExpense();
  const { account } = useAuth();
  
  // Get account members
  const { data: accountMembers } = useQuery({
    queryKey: ['account-members', account?.id],
    queryFn: () => memberService.getAccountMembers(account!.id),
    enabled: !!account?.id
  });
  
  const paymentBreakdown = useMemo(() => {
    if (!accountMembers || accountMembers.length === 0) return null;
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Filter food expenses for current month
    const currentMonthFoodExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return (
        expenseDate.getMonth() === currentMonth &&
        expenseDate.getFullYear() === currentYear &&
        (expense.category === 'מזון' || expense.category === 'מזונות') &&
        expense.status !== 'rejected'
      );
    });
    
    // Calculate total food expenses
    const totalFoodExpenses = currentMonthFoodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Calculate fair share per person
    const fairSharePerPerson = totalFoodExpenses / accountMembers.length;
    
    // Calculate what each person paid
    const breakdown: PaymentBreakdown[] = accountMembers.map(member => {
      const memberExpenses = currentMonthFoodExpenses.filter(expense => expense.paidById === member.user_id);
      const totalPaid = memberExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      const balance = fairSharePerPerson - totalPaid;
      
      return {
        userId: member.user_id,
        userName: member.user_name,
        totalPaid,
        shouldPay: fairSharePerPerson,
        balance
      };
    });
    
    return {
      totalExpenses: totalFoodExpenses,
      fairSharePerPerson,
      breakdown
    };
  }, [expenses, accountMembers]);
  
  if (!paymentBreakdown) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            💰 חלוקת תשלומי מזונות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">טוען נתוני חברי החשבון...</p>
        </CardContent>
      </Card>
    );
  }
  
  const { totalExpenses, fairSharePerPerson, breakdown } = paymentBreakdown;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          💰 חלוקת תשלומי מזונות - חודש נוכחי
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total expenses summary */}
        <div className="text-center p-4 bg-muted rounded-lg">
          <div className="text-sm text-muted-foreground">סה״כ הוצאות מזונות החודש</div>
          <div className="text-2xl font-bold text-primary">₪{Math.round(totalExpenses)}</div>
          <div className="text-sm text-muted-foreground">
            חלק הוגן לאדם: ₪{Math.round(fairSharePerPerson)}
          </div>
        </div>
        
        <Separator />
        
        {/* Individual breakdown */}
        <div className="space-y-3">
          <h4 className="font-semibold">פירוט תשלומים:</h4>
          {breakdown.map((person) => (
            <div key={person.userId} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex-1">
                <div className="font-medium">{person.userName}</div>
                <div className="text-sm text-muted-foreground">
                  שילם: ₪{Math.round(person.totalPaid)}
                </div>
              </div>
              
              <div className="text-right">
                {person.balance > 0 ? (
                  <div className="text-red-600 font-semibold">
                    חייב: ₪{Math.round(person.balance)}
                  </div>
                ) : person.balance < 0 ? (
                  <div className="text-green-600 font-semibold">
                    זכאי: ₪{Math.round(Math.abs(person.balance))}
                  </div>
                ) : (
                  <div className="text-gray-600 font-semibold">
                    מאוזן ✓
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Summary of who owes whom */}
        <Separator />
        
        <div className="space-y-2">
          <h4 className="font-semibold">סיכום התשלומים:</h4>
          {breakdown
            .filter(person => person.balance > 0)
            .map(debtor => {
              const creditors = breakdown.filter(person => person.balance < 0);
              if (creditors.length === 0) return null;
              
              return (
                <div key={debtor.userId} className="text-sm p-2 bg-yellow-50 rounded border border-yellow-200">
                  <span className="font-medium">{debtor.userName}</span> חייב לשלם{' '}
                  <span className="font-bold text-red-600">₪{Math.round(debtor.balance)}</span>
                  {creditors.length === 1 && (
                    <span> ל-<span className="font-medium">{creditors[0].userName}</span></span>
                  )}
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
};