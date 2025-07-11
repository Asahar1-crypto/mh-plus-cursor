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
    
    // Filter current month expenses - only include approved expenses (not paid or rejected)
    const currentMonthExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return (
        expenseDate.getMonth() === currentMonth &&
        expenseDate.getFullYear() === currentYear &&
        expense.status === 'approved'
      );
    });
    
    // Separate expenses that split equally from personal expenses
    const splitEquallyExpenses = currentMonthExpenses.filter(expense => expense.splitEqually === true);
    const personalExpenses = currentMonthExpenses.filter(expense => expense.splitEqually !== true);
    
    // Calculate totals
    const totalSplitEquallyExpenses = splitEquallyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalPersonalExpenses = personalExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // For split equally expenses: split among all members
    // For personal expenses: each person pays what's assigned to them (based on paidById)
    const splitEquallyPerPerson = totalSplitEquallyExpenses / accountMembers.length;
    
    // Calculate what each person should pay and what they actually paid
    const breakdown: PaymentBreakdown[] = accountMembers.map(member => {
      // Personal expenses: what this person should pay (their own personal expenses)
      const memberPersonalExpenses = personalExpenses.filter(expense => expense.paidById === member.user_id);
      const shouldPayPersonal = memberPersonalExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      // Split equally expenses: equal share for everyone
      const shouldPaySplitEqually = splitEquallyPerPerson;
      
      // Total what this person should pay
      const totalShouldPay = shouldPayPersonal + shouldPaySplitEqually;
      
      // What this person actually paid (regardless of category)
      const memberPaidExpenses = currentMonthExpenses.filter(expense => expense.createdBy === member.user_id);
      const totalActuallyPaid = memberPaidExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      // Balance: negative means they overpaid, positive means they owe money
      const balance = totalShouldPay - totalActuallyPaid;
      
      return {
        userId: member.user_id,
        userName: member.user_name,
        totalPaid: totalActuallyPaid,
        shouldPay: totalShouldPay,
        balance
      };
    });
    
    return {
      totalExpenses: totalSplitEquallyExpenses + totalPersonalExpenses,
      totalSplitEquallyExpenses,
      totalPersonalExpenses,
      splitEquallyPerPerson,
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
  
  const { totalExpenses, totalSplitEquallyExpenses, totalPersonalExpenses, splitEquallyPerPerson, breakdown } = paymentBreakdown;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          💰 חלוקת תשלומים חודשיים
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total expenses summary */}
        <div className="text-center p-4 bg-muted rounded-lg">
          <div className="text-sm text-muted-foreground">סה״כ הוצאות החודש</div>
          <div className="text-2xl font-bold text-primary">₪{Math.round(totalExpenses)}</div>
          <div className="text-xs text-muted-foreground grid grid-cols-2 gap-4 mt-2">
            <div>אישי: ₪{Math.round(totalPersonalExpenses)}</div>
            <div>משותף: ₪{Math.round(totalSplitEquallyExpenses)}</div>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            חלק משותף לאדם: ₪{Math.round(splitEquallyPerPerson)}
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