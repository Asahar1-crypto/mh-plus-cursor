
import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Edit3 } from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Child } from '@/contexts/ExpenseContext';
import { useExpense } from '@/contexts/ExpenseContext';
import { useAuth } from '@/contexts/auth';
import EditChildForm from './EditChildForm';

/**
 * Get the billing cycle start and end dates based on billing_cycle_start_day.
 * If today is before the billing day, the cycle is from last month's billing day to this month's billing day.
 * If today is on or after the billing day, the cycle is from this month's billing day to next month's billing day.
 */
function getBillingCycleDates(billingDay: number): { cycleStart: Date; cycleEnd: Date } {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-based

  // Clamp billing day to valid range for each month
  const clamp = (month: number, year: number) => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return Math.min(billingDay, lastDay);
  };

  const thisCycleDay = clamp(currentMonth, currentYear);
  const thisCycleStart = new Date(currentYear, currentMonth, thisCycleDay, 0, 0, 0, 0);

  if (today >= thisCycleStart) {
    // Current cycle: this month's billing day -> next month's billing day
    const nextMonth = currentMonth + 1;
    const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear;
    const nextMonthNorm = nextMonth > 11 ? 0 : nextMonth;
    const nextCycleDay = clamp(nextMonthNorm, nextYear);
    const cycleEnd = new Date(nextYear, nextMonthNorm, nextCycleDay, 0, 0, 0, 0);
    return { cycleStart: thisCycleStart, cycleEnd };
  } else {
    // Current cycle: last month's billing day -> this month's billing day
    const prevMonth = currentMonth - 1;
    const prevYear = prevMonth < 0 ? currentYear - 1 : currentYear;
    const prevMonthNorm = prevMonth < 0 ? 11 : prevMonth;
    const prevCycleDay = clamp(prevMonthNorm, prevYear);
    const cycleStart = new Date(prevYear, prevMonthNorm, prevCycleDay, 0, 0, 0, 0);
    return { cycleStart, cycleEnd: thisCycleStart };
  }
}

interface ChildCardProps {
  child: Child;
}

const ChildCard: React.FC<ChildCardProps> = ({ child }) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { expenses } = useExpense();
  const { account } = useAuth();

  const billingDay = account?.billing_cycle_start_day || 1;

  // Calculate expenses for this child
  const { oneTimeTotal, recurringTotal } = useMemo(() => {
    const { cycleStart, cycleEnd } = getBillingCycleDates(billingDay);

    // All expenses for this child
    const childExpenses = expenses.filter(e => e.childId === child.id);

    // One-time expenses: not a recurring template, within the current billing cycle, and approved/paid
    const oneTime = childExpenses.filter(e => {
      if (e.isRecurring) return false; // Skip recurring templates
      const expDate = new Date(e.date);
      const inCycle = expDate >= cycleStart && expDate < cycleEnd;
      const isRelevant = e.status === 'approved' || e.status === 'paid';
      return inCycle && isRelevant;
    });

    // Recurring/fixed expenses: recurring templates that are still active for this child
    const recurring = childExpenses.filter(e => {
      if (!e.isRecurring) return false;
      // Check if still active
      if (e.hasEndDate && e.endDate && new Date(e.endDate) < new Date()) return false;
      return true;
    });

    const oneTimeSum = oneTime.reduce((sum, e) => sum + e.amount, 0);
    const recurringSum = recurring.reduce((sum, e) => sum + e.amount, 0);

    return { oneTimeTotal: oneTimeSum, recurringTotal: recurringSum };
  }, [expenses, child.id, billingDay]);
  
  // Calculate age
  const birthDate = new Date(child.birthDate);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return (
    <Card className="group hover:scale-105 hover:shadow-2xl transition-all duration-500 animate-fade-in overflow-hidden relative bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
      
      <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4 relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <img 
              src={child.gender === 'daughter' ? '/avatars/roles/daughter.png' : '/avatars/roles/son.png'} 
              alt={child.gender === 'daughter' ? 'בת' : 'בן'} 
              className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-full shrink-0" 
            />
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent truncate">
                {child.name}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {format(new Date(child.birthDate), 'dd/MM/yyyy')} ({age} שנים)
              </CardDescription>
            </div>
          </div>
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-primary/10 transition-colors duration-300">
                <Edit3 className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
              </Button>
            </DialogTrigger>
            <EditChildForm 
              child={child} 
              open={editDialogOpen} 
              setOpen={setEditDialogOpen} 
            />
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2 sm:pb-3 p-3 sm:p-4 relative z-10">
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between p-2 bg-gradient-to-r from-background/50 to-background/30 backdrop-blur-sm rounded-lg border border-border/30 group-hover:border-primary/30 transition-colors duration-300">
            <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
              הוצאות החודש:
            </span>
            <span className="text-xs sm:text-sm font-semibold">₪{oneTimeTotal.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-gradient-to-r from-background/50 to-background/30 backdrop-blur-sm rounded-lg border border-border/30 group-hover:border-primary/30 transition-colors duration-300">
            <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></div>
              הוצאות קבועות:
            </span>
            <span className="text-xs sm:text-sm font-semibold">₪{recurringTotal.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / חודש</span>
          </div>
        </div>
      </CardContent>
      
    </Card>
  );
};

export default ChildCard;
