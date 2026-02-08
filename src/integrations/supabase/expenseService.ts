
import { supabase } from './client';
import { Expense, Child } from '@/contexts/expense/types';
import { User } from '@/contexts/auth/types';
import { Account } from '@/contexts/auth/types';

export const expenseService = {
  async getExpenses(user: User, account: Account): Promise<Expense[]> {
    console.log(`🔍 getExpenses: Starting fetch for user ${user.id} in account ${account.id} (${account.name})`);
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

      // Debug log to see the actual data structure
      console.log(`🔍 Expense ${expense.id}:`, {
        paid_by_data: expense.paid_by,
        created_by_data: expense.created_by,
        paid_by_id: expense.paid_by_id,
        created_by_id: expense.created_by_id
      });

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
        receiptId: expense.receipt_id,
        isRecurring: expense.is_recurring || false,
        frequency: expense.frequency as 'monthly' | 'weekly' | 'yearly' | undefined,
        hasEndDate: expense.has_end_date || false,
        endDate: expense.end_date || undefined,
        includeInMonthlyBalance: true, // Default value
        splitEqually: expense.split_equally || false,
        // New fields for recurring auto-approval
        recurringParentId: expense.recurring_parent_id || undefined,
        recurringAutoApproved: expense.recurring_auto_approved || false,
        recurringApprovedBy: expense.recurring_approved_by || undefined
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
      birthDate: child.birth_date,
      gender: child.gender || 'son'
    }));
  },

  async addExpense(user: User, account: Account, expense: Omit<Expense, 'id' | 'createdBy' | 'creatorName' | 'status'>): Promise<{ id: string; isPending: boolean }> {
    console.log(`Adding expense to account ${account.id} (${account.name})`);
    console.log('Expense data:', expense);
    
    // Auto-approve if user is adding expense for themselves
    const isAutoApproved = user.id === expense.paidById;
    
    const expenseData = {
      amount: expense.amount,
      description: expense.description,
      date: expense.date,
      category: expense.category,
      account_id: account.id,
      paid_by_id: expense.paidById,
      created_by_id: user.id,
      status: isAutoApproved ? 'approved' : 'pending',
      approved_by: isAutoApproved ? user.id : null,
      approved_at: isAutoApproved ? new Date().toISOString() : null,
      has_end_date: expense.hasEndDate || false,
      end_date: expense.endDate || null,
      split_equally: expense.splitEqually,
      is_recurring: expense.isRecurring || false,
      frequency: expense.frequency || null,
      receipt_id: expense.receiptId || null
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

    return { id: newExpense.id, isPending: !isAutoApproved };
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

  async approveAllRecurring(user: User, account: Account, expenseId: string): Promise<void> {
    console.log(`Approving expense ${expenseId} and all future recurring in account ${account.id} (${account.name})`);
    
    // First get the expense to find its recurring_parent_id
    const { data: expense, error: fetchError } = await supabase
      .from('expenses')
      .select('recurring_parent_id')
      .eq('id', expenseId)
      .eq('account_id', account.id)
      .single();

    if (fetchError) {
      console.error('Error fetching expense:', fetchError);
      throw fetchError;
    }

    const parentId = expense?.recurring_parent_id;
    
    if (!parentId) {
      console.error('Expense is not part of a recurring series');
      throw new Error('הוצאה זו אינה חלק מסדרה חוזרת');
    }

    // Approve the current expense
    const { error: approveError } = await supabase
      .from('expenses')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', expenseId)
      .eq('account_id', account.id);

    if (approveError) {
      console.error('Error approving expense:', approveError);
      throw approveError;
    }

    // Mark the parent template for auto-approval of future expenses
    const { error: updateParentError } = await supabase
      .from('expenses')
      .update({
        recurring_auto_approved: true,
        recurring_approved_by: user.id
      })
      .eq('id', parentId)
      .eq('account_id', account.id);

    if (updateParentError) {
      console.error('Error updating parent recurring expense:', updateParentError);
      throw updateParentError;
    }
  },

  async addChild(user: User, account: Account, child: Omit<Child, 'id'>): Promise<void> {
    console.log(`Adding child to account ${account.id} (${account.name})`);
    
    const { error } = await supabase
      .from('children')
      .insert({
        name: child.name,
        birth_date: child.birthDate,
        gender: child.gender || 'son',
        account_id: account.id
      });

    if (error) {
      console.error('Error adding child:', error);
      throw error;
    }
  },

  async updateChild(user: User, account: Account, id: string, updates: Partial<Omit<Child, 'id'>>): Promise<void> {
    console.log(`Updating child ${id} in account ${account.id} (${account.name})`);
    console.log('Updates:', updates);
    
    const updateData: any = {};
    
    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }
    
    if (updates.birthDate !== undefined) {
      updateData.birth_date = updates.birthDate;
    }

    if (updates.gender !== undefined) {
      updateData.gender = updates.gender;
    }

    const { error } = await supabase
      .from('children')
      .update(updateData)
      .eq('id', id)
      .eq('account_id', account.id);

    if (error) {
      console.error('Error updating child:', error);
      throw error;
    }

    console.log('Successfully updated child');
  }
};
