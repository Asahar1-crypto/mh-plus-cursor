import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useExpense } from '@/contexts/ExpenseContext';
import { budgetService } from '@/integrations/supabase/budgetService';
import { useQuery } from '@tanstack/react-query';
import { getBudgetAlertsForMonth, type BudgetAlert } from '@/utils/budgetAlertUtils';

interface BudgetAlertBannerProps {
  selectedMonth: number;
  selectedYear: number;
}

const MONTH_NAMES = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export const BudgetAlertBanner: React.FC<BudgetAlertBannerProps> = ({
  selectedMonth,
  selectedYear,
}) => {
  const { account } = useAuth();
  const { expenses } = useExpense();

  const { data: budgets } = useQuery({
    queryKey: ['budgets', account?.id, selectedMonth, selectedYear],
    queryFn: () => budgetService.getBudgets(account!, selectedMonth + 1, selectedYear),
    enabled: !!account?.id,
  });

  const alerts = useMemo(() => {
    if (!budgets || budgets.length === 0) return [];
    return getBudgetAlertsForMonth(budgets, expenses, selectedMonth + 1, selectedYear);
  }, [budgets, expenses, selectedMonth, selectedYear]);

  if (alerts.length === 0) return null;

  const exceeded = alerts.filter((a) => a.status === 'exceeded');
  const warning = alerts.filter((a) => a.status === 'warning_90');

  const formatAlert = (a: BudgetAlert) =>
    `${a.label}: ₪${a.spent.toFixed(0)} / ₪${a.budget.toFixed(0)}`;

  return (
    <Alert
      variant={exceeded.length > 0 ? 'destructive' : 'default'}
      className={cn(
        exceeded.length > 0
          ? 'border-destructive/50 bg-destructive/10'
          : 'border-amber-500/50 bg-amber-500/10',
        '[&>svg]:right-4 [&>svg]:left-auto [&>svg~*]:pr-7 [&>svg~*]:pl-0'
      )}
      dir="rtl"
    >
      {exceeded.length > 0 ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <TrendingUp className="h-4 w-4 text-amber-600" />
      )}
      <AlertTitle className={exceeded.length > 0 ? 'text-destructive' : 'text-amber-700'}>
        {exceeded.length > 0 ? 'חרגת מהתקציב' : 'התקציב מתקרב ל-90%'}
      </AlertTitle>
      <AlertDescription>
        <span className="block mb-1">
          {MONTH_NAMES[selectedMonth]} {selectedYear}:
        </span>
        {exceeded.length > 0 && (
          <span className="block text-destructive font-medium">
            {exceeded.map(formatAlert).join(' • ')}
          </span>
        )}
        {warning.length > 0 && (
          <span className={exceeded.length > 0 ? 'block mt-1' : ''}>
            {warning.map(formatAlert).join(' • ')}
          </span>
        )}
      </AlertDescription>
    </Alert>
  );
};
