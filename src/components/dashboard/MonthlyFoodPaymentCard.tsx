import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useExpense } from '@/contexts/ExpenseContext';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { memberService } from '@/contexts/auth/services/account/memberService';
import { Separator } from '@/components/ui/separator';
import { ArrowRightLeft, TrendingDown, Calculator, DollarSign } from 'lucide-react';

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
    
    // Filter expenses for the target month and food categories
    const filteredExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const isSameMonth = expenseDate.getMonth() === targetMonth && expenseDate.getFullYear() === targetYear;
      const isFoodCategory = ['מזון', 'מזונות', 'אוכל'].includes(expense.category);
      return isSameMonth && isFoodCategory && expense.status === 'paid';
    });
    
    if (filteredExpenses.length === 0) {
      return null;
    }
    
    // Calculate breakdown
    const breakdown: PaymentBreakdown[] = accountMembers.map(member => {
      let totalPaid = 0;
      
      filteredExpenses.forEach(expense => {
        if (expense.paidById === member.user_id) {
          totalPaid += expense.amount;
        }
      });
      
      return {
        userId: member.user_id,
        userName: member.user_name,
        totalPaid,
        shouldPay: 0, // Will be calculated below
        balance: 0 // Will be calculated below
      };
    });
    
    // Calculate total food expenses
    const totalFoodExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Calculate how much each member should pay (equal split)
    const shouldPayEach = totalFoodExpenses / accountMembers.length;
    
    // Update shouldPay and balance for each member
    breakdown.forEach(member => {
      member.shouldPay = shouldPayEach;
      member.balance = member.totalPaid - shouldPayEach;
    });
    
    return {
      breakdown,
      totalFoodExpenses,
      shouldPayEach
    };
  }, [expenses, accountMembers, selectedMonth]);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0
    }).format(amount);
  };
  
  if (!paymentBreakdown) {
    return (
      <Card className="border-0 bg-gradient-to-br from-slate-50 to-gray-100 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-gray-700">
            <Calculator className="h-5 w-5" />
            <span>חישוב נטו</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-gray-500 text-lg">אין הוצאות מזון לחודש זה</div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Find who owes whom
  const creditors = paymentBreakdown.breakdown.filter(member => member.balance < 0);
  const debtors = paymentBreakdown.breakdown.filter(member => member.balance > 0);
  
  // Simple debt settlement calculation
  const settlements: { from: string; to: string; amount: number }[] = [];
  
  let debtorsCopy = [...debtors];
  let creditorsCopy = [...creditors];
  
  for (const creditor of creditorsCopy) {
    let creditAmount = Math.abs(creditor.balance);
    
    for (const debtor of debtorsCopy) {
      if (creditAmount <= 0 || debtor.balance <= 0) continue;
      
      const transferAmount = Math.min(creditAmount, debtor.balance);
      
      if (transferAmount > 0) {
        settlements.push({
          from: debtor.userName,
          to: creditor.userName,
          amount: transferAmount
        });
        
        creditAmount -= transferAmount;
        debtor.balance -= transferAmount;
      }
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Net Calculation Header */}
      <Card className="border-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-emerald-800">
            <Calculator className="h-6 w-6" />
            <span>חישוב נטו</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Total Summary */}
            <div className="space-y-4">
              <div className="text-center p-4 bg-white/50 rounded-xl">
                <div className="text-sm text-emerald-600 mb-1">סה״כ הוצאות מזון</div>
                <div className="text-2xl font-bold text-emerald-800">
                  {formatCurrency(paymentBreakdown.totalFoodExpenses)}
                </div>
              </div>
              <div className="text-center p-4 bg-white/50 rounded-xl">
                <div className="text-sm text-emerald-600 mb-1">לכל אחד</div>
                <div className="text-xl font-semibold text-emerald-700">
                  {formatCurrency(paymentBreakdown.shouldPayEach)}
                </div>
              </div>
            </div>
            
            {/* Breakdown by Person */}
            <div className="space-y-3">
              {paymentBreakdown.breakdown.map((member) => (
                <div key={member.userId} className="flex items-center justify-between p-3 bg-white/60 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-semibold">
                      {member.userName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-emerald-800">{member.userName}</span>
                  </div>
                  <div className="text-left">
                    <div className="text-sm text-emerald-600">שילם {formatCurrency(member.totalPaid)}</div>
                    <div className={`text-sm font-semibold ${member.balance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {member.balance >= 0 ? 'חייב' : 'זכאי'} {formatCurrency(Math.abs(member.balance))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Settlement Instructions */}
      {settlements.length > 0 && (
        <Card className="border-0 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-amber-800">
              <ArrowRightLeft className="h-6 w-6" />
              <span>הוראות סילוק</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {settlements.map((settlement, index) => (
                <div key={index} className="relative">
                  {/* Main Settlement Card */}
                  <div className="p-6 bg-gradient-to-r from-white/80 to-orange-50/80 rounded-xl border-2 border-orange-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold">
                          <DollarSign className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="text-lg font-bold text-orange-800">
                            {settlement.from} צריך להעביר לטבען
                          </div>
                          <div className="text-sm text-orange-600">
                            {settlement.from} ← {formatCurrency(settlement.amount)} ← {settlement.to}
                          </div>
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-3xl font-bold text-orange-700">
                          {formatCurrency(settlement.amount)}
                        </div>
                        <div className="text-sm text-orange-500 text-center">
                          <TrendingDown className="h-4 w-4 inline mr-1" />
                          סילוק חוב
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Calculation Details */}
                  <div className="mt-3 p-3 bg-orange-50/50 rounded-lg text-sm text-orange-700">
                    <div className="flex justify-between items-center">
                      <span>{settlement.from} שילם {formatCurrency(debtors.find(d => d.userName === settlement.from)?.totalPaid || 0)}</span>
                      <span>מינוס {formatCurrency(paymentBreakdown.shouldPayEach)} = {formatCurrency((debtors.find(d => d.userName === settlement.from)?.totalPaid || 0) - paymentBreakdown.shouldPayEach)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};