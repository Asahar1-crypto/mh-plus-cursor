
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
  receiptId?: string;
  isRecurring: boolean;
  frequency?: 'monthly' | 'weekly' | 'yearly';
  hasEndDate?: boolean;
  endDate?: string;
  includeInMonthlyBalance: boolean;
  splitEqually: boolean;
  // New fields for recurring expense auto-approval
  recurringParentId?: string;
  recurringAutoApproved?: boolean;
  recurringApprovedBy?: string;
  recurringActive?: boolean;
}

export type ChildGender = 'son' | 'daughter';

export interface Child {
  id: string;
  name: string;
  birthDate: string;
  gender: ChildGender;
}

export interface Category {
  id: string;
  account_id: string;
  name: string;
  color: string;
  sort_order: number;
}

export interface ExpenseContextType {
  expenses: Expense[];
  childrenList: Child[];
  categoriesList: Category[];
  isLoading: boolean;
  isSubmitting: boolean;
  addExpense: (expense: Omit<Expense, 'id' | 'createdBy' | 'creatorName' | 'status' | 'approvedBy' | 'approvedAt'>) => Promise<void>;
  updateExpense: (id: string, updates: Partial<Pick<Expense, 'amount' | 'description' | 'date' | 'category' | 'childId' | 'paidById' | 'splitEqually'>>) => Promise<void>;
  updateRecurringActive: (id: string, active: boolean) => Promise<void>;
  approveExpense: (id: string) => Promise<void>;
  approveAllRecurring: (id: string) => Promise<void>;
  rejectExpense: (id: string) => Promise<void>;
  markAsPaid: (id: string) => Promise<void>;
  updateExpenseStatus: (id: string, status: 'pending' | 'approved' | 'rejected' | 'paid') => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addChild: (child: Omit<Child, 'id'>) => Promise<void>;
  updateChild: (id: string, updates: Partial<Omit<Child, 'id'>>) => Promise<void>;
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
  refreshData: () => Promise<void>;
}
