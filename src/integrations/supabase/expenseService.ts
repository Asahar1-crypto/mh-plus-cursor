
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
        paid_by:profiles!paid_by_id(name),
        created_by:profiles!created_by_id(name)
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
        createdBy: expense.created_by_id,
        creatorName: expense.created_by?.name || 'Unknown',
        paidById: expense.paid_by_id,
        paidByName: expense.paid_by?.name || 'Unknown',
        status: expense.status as 'pending' | 'approved' | 'rejected' | 'paid',
        approvedBy: expense.approved_by,
        approvedAt: expense.approved_at,
        receipt: expense.receipt_url,
        isRecurring: false, // Default value, can be updated based on your schema
        frequency: undefined,
        hasEndDate: expense.has_end_date || false,
        endDate: expense.end_date || undefined,
        includeInMonthlyBalance: true, // Default value
        splitEqually: expense.split_equally || false
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
    console.log('Expense data:', expense);
    
    const expenseData = {
      amount: expense.amount,
      description: expense.description,
      date: expense.date,
      category: expense.category,
      account_id: account.id,
      paid_by_id: expense.paidById,
      created_by_id: user.id,
      status: 'pending',
      has_end_date: expense.hasEndDate || false,
      end_date: expense.endDate || null,
      split_equally: expense.splitEqually
    };
    
    console.log('Data being inserted:', expenseData);
    
    const { data: newExpense, error } = await supabase
      .from('expenses')
      .insert(expenseData)
      .select()
      .single();

    if (error) {
      console.error('Error adding expense:', error);
      throw error;
    }

    console.log('Successfully added expense:', newExpense);

    // If there's a child associated, add the relationship
    if (expense.childId && newExpense) {
      console.log('Adding child relationship:', { expense_id: newExpense.id, child_id: expense.childId });
      const { error: childError } = await supabase
        .from('expense_children')
        .insert({
          expense_id: newExpense.id,
          child_id: expense.childId
        });

      if (childError) {
        console.error('Error linking expense to child:', childError);
        // Don't throw here, the expense was created successfully
      } else {
        console.log('Successfully linked expense to child');
      }
    }
  },

  async updateExpenseStatus(user: User, account: Account, expenseId: string, status: 'pending' | 'approved' | 'rejected' | 'paid'): Promise<void> {
    console.log(`Updating expense ${expenseId} status to ${status} in account ${account.id} (${account.name})`);
    
    const updateData: any = { status };
    
    // Add approved by and approved at for approved status
    if (status === 'approved') {
      updateData.approved_by = user.id;
      updateData.approved_at = new Date().toISOString();
    }
    
    const { error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', expenseId)
      .eq('account_id', account.id);

    if (error) {
      console.error('Error updating expense status:', error);
      throw error;
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
