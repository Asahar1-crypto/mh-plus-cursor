import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, CreditCard, TrendingUp, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Expense } from '@/contexts/expense/types';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { memberService } from '@/contexts/auth/services/account/memberService';

interface ExpensesSummaryProps {
  pendingExpenses: Expense[];
  approvedExpenses: Expense[];
  paidExpenses: Expense[];
}

export const ExpensesSummary: React.FC<ExpensesSummaryProps> = ({
  pendingExpenses,
  approvedExpenses, 
  paidExpenses
}) => {
  const { account } = useAuth();
  
  // Get account members
  const { data: accountMembers } = useQuery({
    queryKey: ['account-members', account?.id],
    queryFn: () => memberService.getAccountMembers(account!.id),
    enabled: !!account?.id
  });

  // Calculate totals and breakdown by user
  const summaryData = useMemo(() => {
    const calculateBreakdown = (expenses: Expense[]) => {
      const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const count = expenses.length;
      
      if (!accountMembers || accountMembers.length === 0) {
        return { total, count, breakdown: [] };
      }

      const breakdown = accountMembers.map(member => {
        const userExpenses = expenses.filter(exp => exp.paidById === member.user_id);
        const userTotal = userExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const userCount = userExpenses.length;
        
        return {
          userId: member.user_id,
          userName: member.user_name,
          total: userTotal,
          count: userCount
        };
      });
      
      return { total, count, breakdown };
    };

    const pending = calculateBreakdown(pendingExpenses);
    const approved = calculateBreakdown(approvedExpenses);
    const paid = calculateBreakdown(paidExpenses);
    
    const totalMonth = pending.total + approved.total + paid.total;
    
    return {
      pending,
      approved,
      paid,
      totalMonth
    };
  }, [pendingExpenses, approvedExpenses, paidExpenses, accountMembers]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Main Summary Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 p-8 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-700/20 backdrop-blur-3xl"></div>
        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">חלוקת תשלומים</h2>
              <p className="text-blue-100 text-lg">
                {new Date().toLocaleDateString('he-IL', { year: 'numeric', month: 'long' })}
              </p>
            </div>
            <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
              <Users className="h-5 w-5" />
              <span className="font-medium">{accountMembers?.length || 0} משתתפים</span>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-blue-100 mb-2">סה״כ הוצאות החודש</div>
            <div className="text-5xl font-bold mb-1 bg-gradient-to-r from-blue-100 to-white bg-clip-text text-transparent">
              {formatCurrency(summaryData.totalMonth)}
            </div>
            <div className="text-blue-200 text-sm">
              סה״כ {pendingExpenses.length + approvedExpenses.length + paidExpenses.length} הוצאות
            </div>
          </div>
        </div>
      </div>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pending Card */}
        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-orange-50 to-red-50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/10"></div>
          <CardHeader className="relative pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-orange-800">ממתין לאישור</CardTitle>
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="flex items-baseline space-x-2 mb-2">
              <span className="text-2xl font-bold text-orange-800">
                {formatCurrency(summaryData.pending.total)}
              </span>
              <ArrowUpRight className="h-4 w-4 text-orange-500" />
            </div>
            <div className="text-sm text-orange-600">
              {summaryData.pending.count} הוצאות
            </div>
          </CardContent>
        </Card>

        {/* Approved Card */}
        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/10"></div>
          <CardHeader className="relative pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-blue-800">מאושר</CardTitle>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <CheckCircle className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="flex items-baseline space-x-2 mb-2">
              <span className="text-2xl font-bold text-blue-800">
                {formatCurrency(summaryData.approved.total)}
              </span>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-sm text-blue-600">
              {summaryData.approved.count} הוצאות
            </div>
          </CardContent>
        </Card>

        {/* Paid Card */}
        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/10"></div>
          <CardHeader className="relative pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-green-800">שולם</CardTitle>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="flex items-baseline space-x-2 mb-2">
              <span className="text-2xl font-bold text-green-800">
                {formatCurrency(summaryData.paid.total)}
              </span>
              <ArrowDownRight className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-sm text-green-600">
              {summaryData.paid.count} הוצאות
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Breakdown */}
      {accountMembers && accountMembers.length > 0 && (
        <Card className="border-0 bg-white/70 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-800">פירוט תשלומים לפי משתתף</CardTitle>
            <CardDescription className="text-gray-600">
              סכומים ששולמו על ידי כל משתתף
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Pending Expenses */}
              {summaryData.pending.total > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-orange-800 mb-3 flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    ממתין לאישור
                  </h4>
                  <div className="space-y-2">
                    {summaryData.pending.breakdown.filter(user => user.total > 0).map((userBreakdown) => (
                      <div key={`pending-${userBreakdown.userId}`} className="flex items-center justify-between p-3 rounded-lg bg-orange-50">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-semibold text-sm">
                            {userBreakdown.userName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-orange-800">{userBreakdown.userName}</span>
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-orange-700">{formatCurrency(userBreakdown.total)}</div>
                          <div className="text-sm text-orange-600">{userBreakdown.count} הוצאות</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Approved Expenses */}
              {summaryData.approved.total > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    מאושר
                  </h4>
                  <div className="space-y-2">
                    {summaryData.approved.breakdown.filter(user => user.total > 0).map((userBreakdown) => (
                      <div key={`approved-${userBreakdown.userId}`} className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                            {userBreakdown.userName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-blue-800">{userBreakdown.userName}</span>
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-blue-700">{formatCurrency(userBreakdown.total)}</div>
                          <div className="text-sm text-blue-600">{userBreakdown.count} הוצאות</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Paid Expenses */}
              {summaryData.paid.total > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    שולם
                  </h4>
                  <div className="space-y-2">
                    {summaryData.paid.breakdown.filter(user => user.total > 0).map((userBreakdown) => (
                      <div key={`paid-${userBreakdown.userId}`} className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm">
                            {userBreakdown.userName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-green-800">{userBreakdown.userName}</span>
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-green-700">{formatCurrency(userBreakdown.total)}</div>
                          <div className="text-sm text-green-600">{userBreakdown.count} הוצאות</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};