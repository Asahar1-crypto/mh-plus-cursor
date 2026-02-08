import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useExpense } from '@/contexts/ExpenseContext';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { memberService } from '@/contexts/auth/services/account/memberService';
import { Wallet, ArrowLeft, CheckCircle } from 'lucide-react';

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
    
    return {
      totalExpenses,
      breakdown,
      selectedMonth: selectedMonth || `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`
    };
  }, [expenses, accountMembers, selectedMonth]);

  // Helper to format the month label
  const monthLabel = useMemo(() => {
    const monthStr = paymentBreakdown?.selectedMonth || selectedMonth || '';
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('he-IL', { year: 'numeric', month: 'long' });
  }, [paymentBreakdown?.selectedMonth, selectedMonth]);

  // Loading state
  if (!paymentBreakdown) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50 shadow-xl overflow-hidden relative group transition-all duration-300 hover:shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-purple-500/10 opacity-60"></div>
        <CardContent className="p-4 sm:p-6 relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-violet-500/15 rounded-xl">
              <Wallet className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="font-bold text-lg">חלוקת תשלומים</span>
          </div>
          <div className="flex items-center justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent"></div>
            <span className="text-sm text-muted-foreground mr-3">טוען...</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const { totalExpenses, breakdown } = paymentBreakdown;

  // Pre-calculate net result for the bottom banner
  const userA = breakdown[0];
  const userB = breakdown[1];
  const hasNetCalc = userA && userB;
  const netDifference = hasNetCalc ? userA.balance - userB.balance : 0;

  // Color helpers for balance status
  const getBalanceColor = (balance: number) => {
    if (balance > 0) return {
      bg: 'bg-red-500/10 dark:bg-red-500/15',
      border: 'border-red-200/60 dark:border-red-800/40',
      text: 'text-red-700 dark:text-red-400',
      label: 'חייב'
    };
    if (balance < 0) return {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      border: 'border-emerald-200/60 dark:border-emerald-800/40',
      text: 'text-emerald-700 dark:text-emerald-400',
      label: 'זכאי'
    };
    return {
      bg: 'bg-blue-500/10 dark:bg-blue-500/15',
      border: 'border-blue-200/60 dark:border-blue-800/40',
      text: 'text-blue-700 dark:text-blue-400',
      label: 'מאוזן'
    };
  };
  
  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50 shadow-xl overflow-hidden relative group transition-all duration-300 hover:shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-purple-500/10 opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
      <div className="absolute -top-20 -left-20 w-40 h-40 bg-violet-400/10 rounded-full blur-3xl"></div>
      
      <CardContent className="p-4 sm:p-6 relative z-10 space-y-4">
        {/* Header row: icon + title + total */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/15 rounded-xl group-hover:bg-violet-500/25 transition-colors duration-300">
              <Wallet className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">חלוקת תשלומים</h3>
              <span className="text-xs text-muted-foreground">{monthLabel}</span>
            </div>
          </div>
          <div className="text-left">
            <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent leading-tight">
              ₪{Math.round(totalExpenses).toLocaleString()}
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground text-left">סה״כ הוצאות</div>
          </div>
        </div>

        {/* Member breakdown grid */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {breakdown.map((person) => {
            const colors = getBalanceColor(person.balance);
            const amount = Math.round(Math.abs(person.balance));
            return (
              <div 
                key={person.userId} 
                className={`rounded-xl p-3 sm:p-4 border ${colors.border} ${colors.bg} transition-all duration-200 hover:scale-[1.02]`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${person.balance > 0 ? 'bg-red-500' : person.balance < 0 ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                  <span className="font-semibold text-sm truncate">{person.userName}</span>
                </div>
                <div className={`${colors.text} font-bold text-lg sm:text-xl leading-tight`}>
                  ₪{amount.toLocaleString()}
                </div>
                <div className={`${colors.text} text-[10px] sm:text-xs font-medium opacity-80 mt-0.5`}>
                  {colors.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Net result banner */}
        {hasNetCalc && (
          <div className={`rounded-xl p-3 sm:p-4 text-center transition-all duration-200 ${
            Math.abs(netDifference) < 1
              ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-200/60 dark:border-emerald-800/40'
              : 'bg-amber-500/10 dark:bg-amber-500/15 border border-amber-200/60 dark:border-amber-800/40'
          }`}>
            {Math.abs(netDifference) < 1 ? (
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm sm:text-base">החשבון מאוזן!</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="font-bold text-sm sm:text-base text-amber-800 dark:text-amber-300">
                  {netDifference > 0 ? userA.userName : userB.userName}
                </span>
                <ArrowLeft className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="font-bold text-sm sm:text-base bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
                  ₪{Math.round(Math.abs(netDifference)).toLocaleString()}
                </span>
                <ArrowLeft className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="font-bold text-sm sm:text-base text-amber-800 dark:text-amber-300">
                  {netDifference > 0 ? userB.userName : userA.userName}
                </span>
              </div>
            )}
          </div>
        )}
        
        {!hasNetCalc && breakdown.length < 2 && (
          <div className="text-center py-2">
            <span className="text-xs text-muted-foreground">נדרשים שני חברי חשבון לחישוב נטו</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};