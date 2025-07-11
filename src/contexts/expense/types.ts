
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
  paidById: string;
  paidByName: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  approvedBy?: string;
  approvedAt?: string;
  receipt?: string;
  isRecurring: boolean;
  frequency?: 'monthly' | 'weekly' | 'yearly';
  hasEndDate?: boolean;
  endDate?: string;
  includeInMonthlyBalance: boolean;
}

export interface Child {
  id: string;
  name: string;
  birthDate: string;
}

export interface ExpenseContextType {
  expenses: Expense[];
  childrenList: Child[];
  isLoading: boolean;
  isSubmitting: boolean;
  addExpense: (expense: Omit<Expense, 'id' | 'createdBy' | 'creatorName' | 'status' | 'approvedBy' | 'approvedAt'>) => Promise<void>;
  approveExpense: (id: string) => Promise<void>;
  rejectExpense: (id: string) => Promise<void>;
  markAsPaid: (id: string) => Promise<void>;
  addChild: (child: Omit<Child, 'id'>) => Promise<void>;
  getPendingExpenses: () => Expense[];
  getApprovedExpenses: () => Expense[];
  getPaidExpenses: () => Expense[];
  getRejectedExpenses: () => Expense[];
  getTotalPending: () => number;
  getTotalApproved: () => number;
  getExpensesByChild: (childId: string) => Expense[];
  getExpensesByCategory: (category: string) => Expense[];
  getExpensesByMonth: (month: number, year: number) => Expense[];
  getMonthlyBalance: () => number;
  uploadReceipt: (expenseId: string, receiptUrl: string) => Promise<void>;
}
