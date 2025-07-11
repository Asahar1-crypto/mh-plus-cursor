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
    if (!accountMembers || accountMembers.length === 0) {
      return null;
    }
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Filter current month expenses - include approved and paid expenses
    const currentMonthExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const isCurrentMonth = expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
      const isRelevant = expense.status === 'approved' || expense.status === 'paid';
      return isCurrentMonth && isRelevant;
    });
    
    // Calculate what each person owes based on the rules:
    // 1. split_equally = true: Only the payer owes their half
    // 2. split_equally = false: The payer owes the full amount to the other person
    
    const breakdown: PaymentBreakdown[] = accountMembers.map(member => {
      let totalOwes = 0;
      
      // Go through all expenses and see what this member owes
      currentMonthExpenses.forEach(expense => {
        if (expense.paidById === member.user_id) {
          // This member is designated as the one who should pay
          if (expense.splitEqually) {
            // Half-half: only owes their half
            totalOwes += expense.amount / 2;
          } else {
            // Full payment: owes the full amount
            totalOwes += expense.amount;
          }
        }
        // If this member is NOT the payer, they don't owe anything for this expense
      });
      
      return {
        userId: member.user_id,
        userName: member.user_name,
        totalPaid: 0, // Not relevant in this calculation
        shouldPay: totalOwes,
        balance: totalOwes // Positive means they owe money
      };
    });
    
    // Calculate totals for display
    const totalExpenses = currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Debug logging to verify calculations
    console.log('🔍 Payment Breakdown Debug:', {
      totalExpenses,
      currentMonthExpensesCount: currentMonthExpenses.length,
      breakdown: breakdown.map(b => ({
        name: b.userName,
        shouldPay: Math.round(b.shouldPay),
        balance: Math.round(b.balance)
      }))
    });
    
    return {
      totalExpenses,
      breakdown
    };
  }, [expenses, accountMembers]);
  
  if (!paymentBreakdown) {
    return (
      <Card>
        <CardHeader>
         <CardTitle className="flex items-center gap-2">
            💰 חלוקת תשלומים חודשיים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">טוען נתוני חברי החשבון...</p>
        </CardContent>
      </Card>
    );
  }
  
  const { totalExpenses, breakdown } = paymentBreakdown;
  
  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          💰 חלוקת תשלומים חודשיים
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
        {/* Total expenses summary */}
        <div className="text-center p-3 sm:p-4 bg-muted rounded-lg">
          <div className="text-xs sm:text-sm text-muted-foreground">סה״כ הוצאות החודש</div>
          <div className="text-xl sm:text-2xl font-bold text-primary">₪{Math.round(totalExpenses)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            סה״כ חובות: ₪{Math.round(breakdown.reduce((sum, person) => sum + Math.max(0, person.balance), 0))}
          </div>
        </div>
        
        <Separator />
        
        {/* Individual breakdown */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm sm:text-base">פירוט תשלומים:</h4>
          {breakdown.map((person) => (
            <div key={person.userId} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border gap-2 sm:gap-0">
              <div className="flex-1">
                <div className="font-medium text-sm sm:text-base">{person.userName}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  תרם: ₪{Math.round(person.totalPaid)}
                </div>
              </div>
              
              <div className="text-right">
                {person.balance > 0 ? (
                  <div className="text-red-600 font-semibold text-sm sm:text-base">
                    חייב: ₪{Math.round(person.balance)}
                  </div>
                ) : person.balance < 0 ? (
                  <div className="text-green-600 font-semibold text-sm sm:text-base">
                    זכאי: ₪{Math.round(Math.abs(person.balance))}
                  </div>
                ) : (
                  <div className="text-gray-600 font-semibold text-sm sm:text-base">
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
          <h4 className="font-semibold text-sm sm:text-base">סיכום התשלומים:</h4>
          {breakdown
            .filter(person => person.balance > 0)
            .map(debtor => {
              const creditors = breakdown.filter(person => person.balance < 0);
              
              return (
                <div key={debtor.userId} className="text-xs sm:text-sm p-2 sm:p-3 bg-yellow-50 rounded border border-yellow-200">
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