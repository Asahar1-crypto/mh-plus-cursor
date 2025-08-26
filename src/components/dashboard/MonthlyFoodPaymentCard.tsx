import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useExpense } from '@/contexts/ExpenseContext';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { memberService } from '@/contexts/auth/services/account/memberService';
import { Separator } from '@/components/ui/separator';
import { Wallet, ArrowRightLeft, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';

interface PaymentBreakdown {
  userId: string;
  userName: string;
  totalPaid: number;
  shouldPay: number;
  balance: number; // positive = needs to pay more, negative = overpaid
}

interface MonthlyFoodPaymentCardProps {
  selectedMonth?: string;
}

export const MonthlyFoodPaymentCard: React.FC<MonthlyFoodPaymentCardProps> = ({ selectedMonth }) => {
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
    
    // Parse selected month or use current month as fallback
    let targetMonth: number;
    let targetYear: number;
    
    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number);
      targetMonth = month - 1; // Convert to 0-based month
      targetYear = year;
    } else {
      const currentDate = new Date();
      targetMonth = currentDate.getMonth();
      targetYear = currentDate.getFullYear();
    }
    
    // Filter expenses for the selected month - only approved expenses (not paid ones)
    const selectedMonthExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const isSelectedMonth = expenseDate.getMonth() === targetMonth && expenseDate.getFullYear() === targetYear;
      const isRelevant = expense.status === 'approved'; // Only approved, not paid
      return isSelectedMonth && isRelevant;
    });
    
    // Calculate what each person owes based on the rules:
    // 1. split_equally = true: Only the payer owes their half
    // 2. split_equally = false: The payer owes the full amount to the other person
    
    const breakdown: PaymentBreakdown[] = accountMembers.map(member => {
      let totalOwes = 0;
      
      // Go through all expenses and see what this member owes
      selectedMonthExpenses.forEach(expense => {
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
    const totalExpenses = selectedMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Debug logging to verify calculations
    console.log('🔍 Payment Breakdown Debug:', {
      selectedMonth,
      targetMonth: targetMonth + 1, // Display as 1-based
      targetYear,
      totalExpenses,
      selectedMonthExpensesCount: selectedMonthExpenses.length,
      breakdown: breakdown.map(b => ({
        name: b.userName,
        shouldPay: Math.round(b.shouldPay),
        balance: Math.round(b.balance)
      }))
    });
    
    return {
      totalExpenses,
      breakdown,
      selectedMonth: selectedMonth || `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`
    };
  }, [expenses, accountMembers, selectedMonth]);
  
  if (!paymentBreakdown) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50 shadow-xl hover:shadow-2xl transition-all duration-500 group overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/10 opacity-60"></div>
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-primary/20 rounded-full">
              <Wallet className="h-6 w-6 text-primary animate-pulse" />
            </div>
            חלוקת תשלומים חודשיים
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="flex items-center justify-center p-8">
            <div className="text-center space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="text-muted-foreground font-medium">טוען נתוני חברי החשבון...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const { totalExpenses, breakdown } = paymentBreakdown;
  
  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50 shadow-xl hover:shadow-2xl transition-all duration-500 group overflow-hidden animate-scale-in">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/10 opacity-60 group-hover:opacity-90 transition-opacity duration-500"></div>
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
      
      <CardHeader className="p-4 sm:p-6 relative z-10">
        <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
          <div className="p-2 bg-primary/20 rounded-full group-hover:bg-primary/30 transition-colors duration-300">
            <Wallet className="h-6 w-6 text-primary animate-pulse group-hover:animate-bounce transition-all duration-300" />
          </div>
          חלוקת תשלומים - {(() => {
            const [year, month] = (paymentBreakdown.selectedMonth || selectedMonth || '').split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1);
            return date.toLocaleDateString('he-IL', { year: 'numeric', month: 'long' });
          })()}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6 p-4 sm:p-6 pt-0 relative z-10">
        {/* Total expenses summary with enhanced design */}
        <div className="text-center p-4 sm:p-6 bg-gradient-to-r from-primary/10 to-accent/10 backdrop-blur-sm rounded-xl border border-primary/20 hover:border-primary/40 transition-all duration-300 group/total">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-primary animate-pulse" />
            <div className="text-sm font-semibold text-muted-foreground">סה״כ הוצאות החודש</div>
          </div>
          <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent group-hover/total:scale-110 transition-transform duration-300">
            ₪{Math.round(totalExpenses)}
          </div>
          <div className="text-xs text-muted-foreground mt-2 p-2 bg-background/50 rounded-lg">
            סה״כ חובות: ₪{Math.round(breakdown.reduce((sum, person) => sum + Math.max(0, person.balance), 0))}
          </div>
        </div>
        
        <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />
        
        {/* Individual breakdown with enhanced design */}
        <div className="space-y-4">
          <h4 className="font-bold text-base sm:text-lg flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            פירוט תשלומים:
          </h4>
          {breakdown.map((person, index) => (
            <div 
              key={person.userId} 
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-gradient-to-r from-background/80 to-background/60 backdrop-blur-sm border border-border/50 hover:border-primary/30 gap-3 sm:gap-0 group/person hover:shadow-lg transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex-1">
                <div className="font-semibold text-base flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-primary to-accent"></div>
                  {person.userName}
                </div>
              </div>
              
              <div className="text-right">
                {person.balance > 0 ? (
                  <div className="flex items-center gap-2 justify-end">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2 rounded-lg">
                      <div className="text-red-700 dark:text-red-400 font-bold text-sm sm:text-base">
                        חייב: ₪{Math.round(person.balance)}
                      </div>
                    </div>
                  </div>
                ) : person.balance < 0 ? (
                  <div className="flex items-center gap-2 justify-end">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-2 rounded-lg">
                      <div className="text-green-700 dark:text-green-400 font-bold text-sm sm:text-base">
                        זכאי: ₪{Math.round(Math.abs(person.balance))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 justify-end">
                    <CheckCircle className="h-4 w-4 text-blue-500" />
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-3 py-2 rounded-lg">
                      <div className="text-blue-700 dark:text-blue-400 font-bold text-sm sm:text-base">
                        מאוזן ✓
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />
        
        {/* Net calculation with enhanced design */}
        <div className="space-y-4">
          <h4 className="font-bold text-base sm:text-lg flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary animate-pulse" />
            החישוב הנטו:
          </h4>
          {(() => {
            const userA = breakdown[0];
            const userB = breakdown[1];
            
            if (!userA || !userB) {
              return (
                <div className="text-center p-4 bg-gradient-to-r from-muted/50 to-muted/30 backdrop-blur-sm rounded-xl border border-border/50">
                  <div className="text-sm text-muted-foreground">נדרשים שני משתמשים לחישוב נטו</div>
                </div>
              );
            }
            
            const netDifference = userA.balance - userB.balance;
            
            return (
              <div className="space-y-4">
                {/* Individual balances with enhanced design */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-gradient-to-br from-background/80 to-background/60 backdrop-blur-sm rounded-xl border border-border/50 hover:border-primary/30 transition-all duration-300 group/balance">
                    <div className="font-semibold text-sm mb-1">{userA.userName}</div>
                    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-2 py-1 rounded text-red-700 dark:text-red-400 text-xs font-bold">
                      חייב: ₪{Math.round(userA.balance)}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gradient-to-br from-background/80 to-background/60 backdrop-blur-sm rounded-xl border border-border/50 hover:border-primary/30 transition-all duration-300 group/balance">
                    <div className="font-semibold text-sm mb-1">{userB.userName}</div>
                    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-2 py-1 rounded text-red-700 dark:text-red-400 text-xs font-bold">
                      חייב: ₪{Math.round(userB.balance)}
                    </div>
                  </div>
                </div>
                
                {/* Net result with enhanced design */}
                <div className="text-center">
                  <div className="text-sm font-semibold text-muted-foreground mb-3 flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    תוצאה נטו:
                  </div>
                  {Math.abs(netDifference) < 1 ? (
                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl border border-green-200 dark:border-green-800 animate-scale-in">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <CheckCircle className="h-6 w-6 text-green-600 animate-bounce" />
                        <div className="font-bold text-green-700 dark:text-green-400 text-lg">החשבון מאוזן!</div>
                      </div>
                      <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded-lg">אין צורך בהעברת כסף</div>
                    </div>
                  ) : netDifference > 0 ? (
                    <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 rounded-xl border border-orange-200 dark:border-orange-800 animate-scale-in">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <ArrowRightLeft className="h-6 w-6 text-orange-600 animate-pulse" />
                        <div className="font-bold text-orange-700 dark:text-orange-400 text-lg">
                          {userA.userName} צריך להעביר ₪{Math.round(Math.abs(netDifference))} ל{userB.userName}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded-lg">
                        {userA.userName} חייב ₪{Math.round(userA.balance)} מינוס {userB.userName} חייב ₪{Math.round(userB.balance)} = ₪{Math.round(Math.abs(netDifference))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 rounded-xl border border-orange-200 dark:border-orange-800 animate-scale-in">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <ArrowRightLeft className="h-6 w-6 text-orange-600 animate-pulse" />
                        <div className="font-bold text-orange-700 dark:text-orange-400 text-lg">
                          {userB.userName} צריך להעביר ₪{Math.round(Math.abs(netDifference))} ל{userA.userName}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded-lg">
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