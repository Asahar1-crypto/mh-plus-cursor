import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useExpense } from '@/contexts/ExpenseContext';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { memberService } from '@/contexts/auth/services/account/memberService';
import { Wallet, ArrowLeft, CheckCircle } from 'lucide-react';
import { isDateInCycle } from '@/utils/billingCycleUtils';

interface PaymentBreakdown {
  userId: string;
  userName: string;
  totalPaid: number;
  shouldPay: number;
  balance: number; // positive = needs to pay more, negative = overpaid
}

interface MonthlyFoodPaymentCardProps {
  selectedMonth?: string;
  billingDay?: number;
}

export const MonthlyFoodPaymentCard: React.FC<MonthlyFoodPaymentCardProps> = ({ selectedMonth, billingDay = 1 }) => {
  const { expenses } = useExpense();
  const { account } = useAuth();
  
  // Get account members
  const { data: accountMembers } = useQuery({
    queryKey: ['account-members', account?.id],
    queryFn: () => memberService.getAccountMembers(account!.id),
    enabled: !!account?.id
  });
  
  // Virtual partner support: augment members list when solo user has virtual partner
  const hasVirtualPartner = accountMembers?.length === 1 && !!account?.virtual_partner_name && !!account?.virtual_partner_id;
  const effectiveMembers = useMemo(() => {
    if (!accountMembers) return accountMembers;
    if (hasVirtualPartner) {
      return [
        ...accountMembers,
        { user_id: account!.virtual_partner_id!, user_name: account!.virtual_partner_name!, role: 'member' as const, joined_at: '' }
      ];
    }
    return accountMembers;
  }, [accountMembers, hasVirtualPartner, account?.virtual_partner_id, account?.virtual_partner_name]);

  const paymentBreakdown = useMemo(() => {
    if (!effectiveMembers || effectiveMembers.length === 0) {
      return null;
    }
    
    // Parse selected month or use current month as fallback
    let targetMonth: number; // 1-based
    let targetYear: number;

    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number);
      targetMonth = month;
      targetYear = year;
    } else {
      const currentDate = new Date();
      targetMonth = currentDate.getMonth() + 1;
      targetYear = currentDate.getFullYear();
    }

    // Filter expenses for the selected billing cycle - only approved expenses (not paid ones)
    const selectedMonthExpenses = expenses.filter(expense => {
      const inCycle = isDateInCycle(expense.date, billingDay, targetMonth, targetYear);
      const isRelevant = expense.status === 'approved'; // Only approved, not paid
      return inCycle && isRelevant;
    });
    
    // Calculate what each person owes based on the rules:
    // 1. split_equally = true: Only the payer owes their half
    // 2. split_equally = false: The payer owes the full amount to the other person
    
    const breakdown: PaymentBreakdown[] = effectiveMembers.map(member => {
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
      selectedMonth: selectedMonth || `${targetYear}-${String(targetMonth).padStart(2, '0')}`
    };
  }, [expenses, effectiveMembers, selectedMonth, billingDay]);

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
      <Card className="bg-card border border-primary/20 shadow-md overflow-hidden relative group transition-shadow duration-300 hover:shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/10"></div>
        <CardContent className="p-4 sm:p-6 relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <span className="type-h3">חלוקת תשלומים</span>
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

  // Color helpers for balance status — aligned with Deep Teal + Amber palette.
  // "חייב" (owes) uses amber: it's an action item, not a failure — warm, not alarming.
  // "זכאי" (owed): emerald (success/positive).
  // "מאוזן" (balanced): teal primary (on-brand neutral/resolved).
  const getBalanceColor = (balance: number) => {
    if (balance > 0) return {
      bg: 'bg-gradient-to-br from-amber-50/80 to-orange-50/40 dark:from-amber-950/30 dark:to-orange-950/20',
      border: 'border-amber-200/60 dark:border-amber-800/40',
      text: 'text-amber-800 dark:text-amber-300',
      dot: 'bg-amber-500',
      label: 'חייב'
    };
    if (balance < 0) return {
      bg: 'bg-gradient-to-br from-emerald-50/80 to-green-50/40 dark:from-emerald-950/30 dark:to-green-950/20',
      border: 'border-emerald-200/60 dark:border-emerald-800/40',
      text: 'text-emerald-800 dark:text-emerald-300',
      dot: 'bg-emerald-500',
      label: 'זכאי'
    };
    return {
      bg: 'bg-primary/5',
      border: 'border-primary/20',
      text: 'text-primary',
      dot: 'bg-primary',
      label: 'מאוזן'
    };
  };

  return (
    <Card className="bg-card border border-primary/20 shadow-md overflow-hidden relative group transition-shadow duration-300 hover:shadow-lg">
      {/* Very subtle brand wash — teal→amber at low opacity */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/10"></div>

      <CardContent className="p-4 sm:p-6 relative z-10 space-y-4">
        {/* Header row: icon + title + total */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="type-h3 leading-tight">חלוקת תשלומים</h3>
              <span className="type-caption">{monthLabel}</span>
            </div>
          </div>
          <div className="text-left">
            {/* Brand signature gradient — teal→amber from --gradient-accent */}
            <div className="type-num text-2xl sm:text-3xl font-extrabold bg-[image:var(--gradient-accent)] bg-clip-text text-transparent leading-tight">
              ₪{Math.round(totalExpenses).toLocaleString()}
            </div>
            <div className="type-caption text-left">סה״כ הוצאות</div>
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
                className={`rounded-xl p-3 sm:p-4 border ${colors.border} ${colors.bg} transition-shadow duration-200 hover:shadow-md`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${colors.dot}`}></div>
                  <span className="type-label truncate">{person.userName}</span>
                </div>
                <div className={`${colors.text} type-num text-lg sm:text-xl font-bold leading-tight`}>
                  ₪{amount.toLocaleString()}
                </div>
                <div className={`${colors.text} text-[10px] sm:text-xs font-medium opacity-80 mt-0.5`}>
                  {colors.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Net result banner — frosted liquid-glass with full brand gradient flow */}
        {hasNetCalc && (
          <div className={`rounded-xl p-3 sm:p-4 text-center transition-all duration-200 liquid-glass-subtle ${
            Math.abs(netDifference) < 1
              ? 'bg-gradient-to-l from-emerald-500/10 via-primary/10 to-emerald-500/10 border border-emerald-200/40 dark:border-emerald-800/30'
              : 'bg-gradient-to-l from-amber-500/10 via-primary/10 to-emerald-500/10 border border-primary/20'
          }`}>
            {Math.abs(netDifference) < 1 ? (
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span className="type-h3 text-emerald-700 dark:text-emerald-400">החשבון מאוזן!</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="type-label text-sm sm:text-base font-bold text-foreground">
                  {netDifference > 0 ? userA.userName : userB.userName}
                </span>
                <ArrowLeft className="h-4 w-4 text-primary shrink-0" />
                <span className="type-num text-sm sm:text-base font-bold bg-[image:var(--gradient-accent)] bg-clip-text text-transparent">
                  ₪{Math.round(Math.abs(netDifference)).toLocaleString()}
                </span>
                <ArrowLeft className="h-4 w-4 text-primary shrink-0" />
                <span className="type-label text-sm sm:text-base font-bold text-foreground">
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