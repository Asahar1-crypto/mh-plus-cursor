
import { supabase } from './client';
import { Expense, Child } from '@/contexts/expense/types';
import { User } from '@/contexts/AuthContext';
import { Account } from '@/contexts/auth/types';

export const expenseService = {
  async getExpenses(user: User, account: Account): Promise<Expense[]> {
    console.log(`Getting expenses for user ${user.id} in account ${account.id} (${account.name})`);
    
    // Fetch expenses from the specific account
    const { data: rawExpenses, error } = await supabase
      .from('expenses')
      .select(`
        *,
        expense_children(
          child_id,
          children(
            name
          )
        ),
        paid_by:profiles!paid_by_id(name)
      `)
      .eq('account_id', account.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching expenses:', error);
      throw error;
    }

    console.log(`Raw expenses data for account ${account.name}:`, rawExpenses);

    if (!rawExpenses || rawExpenses.length === 0) {
      console.log(`No expenses found for account ${account.name}`);
      return [];
    }

    // Transform the data to match our Expense interface
    const transformedExpenses: Expense[] = rawExpenses.map((expense: any) => {
      // Get child name from the joined data
      const childName = expense.expense_children?.[0]?.children?.name || null;
      const childId = expense.expense_children?.[0]?.child_id || null;

      return {
        id: expense.id,
        amount: parseFloat(expense.amount),
        description: expense.description,
        date: expense.date,
        category: expense.category || 'כללי',
        childId: childId,
        childName: childName,
        createdBy: user.id, // The user who created the expense
        creatorName: user.name, // The user who created the expense
        paidById: expense.paid_by_id,
        paidByName: expense.paid_by?.name || 'Unknown',
        status: expense.status as 'pending' | 'approved' | 'rejected' | 'paid',
        receipt: expense.receipt_url,
        isRecurring: false, // Default value, can be updated based on your schema
        includeInMonthlyBalance: true // Default value
      };
    });

    console.log(`Transformed ${transformedExpenses.length} expenses for account ${account.name}`);
    return transformedExpenses;
  },

  async getChildren(user: User, account: Account): Promise<Child[]> {
    console.log(`Getting children for user ${user.id} in account ${account.id} (${account.name})`);
    
    const { data: children, error } = await supabase
      .from('children')
      .select('*')
      .eq('account_id', account.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching children:', error);
      throw error;
    }

    if (!children || children.length === 0) {
      console.log(`No children found for account ${account.name}`);
      return [];
    }

    console.log(`Found ${children.length} children for account ${account.name}`);
    return children.map((child: any) => ({
      id: child.id,
      name: child.name,
      birthDate: child.birth_date
    }));
  },

  async addExpense(user: User, account: Account, expense: Omit<Expense, 'id' | 'createdBy' | 'creatorName' | 'status'>): Promise<void> {
    console.log(`Adding expense to account ${account.id} (${account.name})`);
    
    const { data: newExpense, error } = await supabase
      .from('expenses')
      .insert({
        amount: expense.amount,
        description: expense.description,
        date: expense.date,
        category: expense.category,
        account_id: account.id,
        paid_by_id: expense.paidById,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding expense:', error);
      throw error;
    }

    // If there's a child associated, add the relationship
    if (expense.childId && newExpense) {
      const { error: childError } = await supabase
        .from('expense_children')
        .insert({
          expense_id: newExpense.id,
          child_id: expense.childId
        });

      if (childError) {
        console.error('Error linking expense to child:', childError);
        // Don't throw here, the expense was created successfully
      }
    }
  },

  async addChild(user: User, account: Account, child: Omit<Child, 'id'>): Promise<void> {
    console.log(`Adding child to account ${account.id} (${account.name})`);
    
    const { error } = await supabase
      .from('children')
      .insert({
        name: child.name,
        birth_date: child.birthDate,
        account_id: account.id
      });

    if (error) {
      console.error('Error adding child:', error);
      throw error;
    }
  }
};
