
export interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string;
  category: string;
  childId?: string;
  childName?: string;
  createdBy: string;
  creatorName: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  receipt?: string;
  isRecurring: boolean;
  frequency?: 'monthly' | 'weekly' | 'yearly';
}

export interface Child {
  id: string;
  name: string;
  birthDate: string;
}

export interface ExpenseContextType {
  expenses: Expense[];
  childrenList: Child[];
  addExpense: (expense: Omit<Expense, 'id' | 'createdBy' | 'creatorName' | 'status'>) => Promise<void>;
  approveExpense: (id: string) => Promise<void>;
  rejectExpense: (id: string) => Promise<void>;
  markAsPaid: (id: string) => Promise<void>;
  addChild: (child: Omit<Child, 'id'>) => Promise<void>;
  getPendingExpenses: () => Expense[];
  getApprovedExpenses: () => Expense[];
  getPaidExpenses: () => Expense[];
  getTotalPending: () => number;
  getTotalApproved: () => number;
  getExpensesByChild: (childId: string) => Expense[];
}
