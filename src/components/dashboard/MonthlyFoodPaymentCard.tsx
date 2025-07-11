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
    
    // Calculate what each person owes/paid based on correct logic:
    // 1. paidById = who actually paid out of pocket
    // 2. split_equally = true: each person owes half
    // 3. split_equally = false: the person who didn't pay owes the full amount
    
    const breakdown: PaymentBreakdown[] = accountMembers.map(member => {
      let totalPaid = 0;
      let totalOwes = 0;
      
      // Go through all expenses
      currentMonthExpenses.forEach(expense => {
        if (expense.paidById === member.user_id) {
          // This member paid out of pocket
          totalPaid += expense.amount;
        }
        
        // Calculate what this member should contribute
        if (expense.splitEqually) {
          // Everyone pays half
          totalOwes += expense.amount / 2;
        } else {
          // Only the non-payer owes the full amount
          if (expense.paidById !== member.user_id) {
            totalOwes += expense.amount;
          }
          // If this person paid and it's not split equally, they don't owe anything additional
        }
      });
      
      // Balance = what they owe minus what they already paid
      // Positive = they owe money, Negative = they are owed money
      const balance = totalOwes - totalPaid;
      
      return {
        userId: member.user_id,
        userName: member.user_name,
        totalPaid,
        shouldPay: totalOwes,
        balance
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
        
        <div className="space-y-3">
          <h4 className="font-semibold text-sm sm:text-base">החישוב הנטו:</h4>
          {(() => {
            // Calculate net balance between users  
            const userA = breakdown[0];
            const userB = breakdown[1];
            
            if (!userA || !userB) {
              return (
                <div className="text-xs sm:text-sm p-2 sm:p-3 bg-gray-50 rounded border border-gray-200 text-center">
                  נדרשים שני משתמשים לחישוב נטו
                </div>
              );
            }
            
            // Calculate the net difference
            const netDifference = userA.balance - userB.balance;
            
            return (
              <div className="space-y-2">
                {/* Show individual balances */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="font-medium">{userA.userName}</div>
                    <div className="text-red-600">חייב: ₪{Math.round(userA.balance)}</div>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="font-medium">{userB.userName}</div>
                    <div className="text-red-600">חייב: ₪{Math.round(userB.balance)}</div>
                  </div>
                </div>
                
                {/* Show net result */}
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">תוצאה נטו:</div>
                  {Math.abs(netDifference) < 1 ? (
                    <div className="p-3 bg-green-50 rounded border border-green-200">
                      <div className="font-bold text-green-700">💚 החשבון מאוזן!</div>
                      <div className="text-xs text-muted-foreground mt-1">אין צורך בהעברת כסף</div>
                    </div>
                  ) : netDifference > 0 ? (
                    <div className="p-3 bg-orange-50 rounded border border-orange-200">
                      <div className="font-bold text-orange-700 text-lg">
                        💸 {userB.userName} צריך להעביר ₪{Math.round(Math.abs(netDifference))} ל{userA.userName}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {userA.userName} חייב ₪{Math.round(userA.balance)} מינוס {userB.userName} חייב ₪{Math.round(userB.balance)} = ₪{Math.round(Math.abs(netDifference))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-orange-50 rounded border border-orange-200">
                      <div className="font-bold text-orange-700 text-lg">
                        💸 {userA.userName} צריך להעביר ₪{Math.round(Math.abs(netDifference))} ל{userB.userName}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {userB.userName} חייב ₪{Math.round(userB.balance)} מינוס {userA.userName} חייב ₪{Math.round(userA.balance)} = ₪{Math.round(Math.abs(netDifference))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </CardContent>
    </Card>
  );
};