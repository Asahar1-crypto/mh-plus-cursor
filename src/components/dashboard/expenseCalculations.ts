
import { Expense } from '@/contexts/expense/types';

interface MemberInfo {
  user_id: string;
  user_name: string;
}

interface BreakdownItem {
  userName: string;
  amount: number;
  count: number;
}

interface BreakdownResult {
  total: number;
  count: number;
  breakdown: BreakdownItem[];
}

export const calculateBreakdown = (expenses: Expense[], accountMembers?: MemberInfo[]): BreakdownResult => {
  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const count = expenses.length;

  if (!accountMembers || accountMembers.length === 0) {
    return { total, count, breakdown: [] };
  }

  const breakdown = accountMembers.map(member => {
    let userTotal = 0;
    let userCount = 0;

    expenses.forEach(exp => {
      if (exp.paidById === member.user_id) {
        // This member paid the expense
        if (exp.splitEqually) {
          userTotal += exp.amount / 2; // Only their half
        } else {
          userTotal += exp.amount; // Full amount
        }
        userCount++;
      } else if (exp.splitEqually && accountMembers.some(m => m.user_id === exp.paidById)) {
        // This member didn't pay, but it's split equally and someone else from the account paid
        userTotal += exp.amount / 2; // They owe their half
        userCount++;
      }
    });

    return {
      userName: member.user_name,
      amount: userTotal,
      count: userCount
    };
  });

  return { total, count, breakdown };
};
