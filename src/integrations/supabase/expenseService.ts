
import { supabase } from './client';
import { Expense, Child } from '@/contexts/expense/types';
import { User } from '@/contexts/auth/types';
import { Account } from '@/contexts/auth/types';

export const expenseService = {
  async getExpenses(user: User, account: Account): Promise<Expense[]> {
    // Fetch expenses for user in account
    
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

    if (!rawExpenses || rawExpenses.length === 0) {
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
        recurringApprovedBy: expense.recurring_approved_by || undefined,
        recurringActive: expense.recurring_active ?? true,
        isIndexLinked: expense.is_index_linked || false,
        baseAmount: expense.base_amount ?? undefined,
        baseIndexPeriod: expense.base_index_period || undefined,
        indexUpdateFrequency: expense.index_update_frequency as 'monthly' | 'quarterly' | 'yearly' | undefined,
        floorEnabled: expense.floor_enabled ?? true,
        lastCalculatedAmount: expense.last_calculated_amount ?? undefined,
        // Template edit approval
        pendingChanges: expense.pending_changes ?? null,
        editedById: expense.edited_by_id ?? undefined,
      };
    });

    return transformedExpenses;
  },

  async getChildren(user: User, account: Account): Promise<Child[]> {
    // Fetch children for account
    
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
      return [];
    }
    return children.map((child: any) => ({
      id: child.id,
      name: child.name,
      birthDate: child.birth_date,
      gender: child.gender || 'son',
      budgetLimit: child.budget_limit ?? undefined,
    }));
  },

  async addExpense(user: User, account: Account, expense: Omit<Expense, 'id' | 'createdBy' | 'creatorName' | 'status'>): Promise<{ id: string; isPending: boolean }> {
    // Adding expense to account
    
    // Auto-approve if:
    // 1. User is adding expense for themselves, OR
    // 2. Account is on Personal plan (single user, no partner to approve), OR
    // 3. Account has a virtual partner AND no real second member
    const isPersonalPlan = account.plan_slug === 'personal';

    // Check if the account has a virtual partner with no real second member
    let hasOnlyVirtualPartner = false;
    if (account.virtual_partner_name && account.virtual_partner_id) {
      const { count } = await supabase
        .from('account_members')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', account.id);
      hasOnlyVirtualPartner = (count ?? 0) < 2;
    }
    const isAutoApproved = isPersonalPlan || user.id === expense.paidById || hasOnlyVirtualPartner;
    
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
    
    const { data: newExpense, error } = await supabase
      .from('expenses')
      .insert(expenseData)
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

    return { id: newExpense.id, isPending: !isAutoApproved };
  },

  async updateExpense(user: User, account: Account, expenseId: string, updates: Partial<{
    amount: number;
    description: string;
    date: string;
    category: string;
    childId: string | undefined;
    paidById: string;
    splitEqually: boolean;
  }>): Promise<void> {
    const updateData: Record<string, unknown> = {};
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.paidById !== undefined) updateData.paid_by_id = updates.paidById;
    if (updates.splitEqually !== undefined) updateData.split_equally = updates.splitEqually;

    const { error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', expenseId)
      .eq('account_id', account.id);

    if (error) {
      console.error('Error updating expense:', error);
      throw error;
    }

    if (updates.childId !== undefined) {
      await supabase.from('expense_children').delete().eq('expense_id', expenseId);
      if (updates.childId) {
        await supabase.from('expense_children').insert({
          expense_id: expenseId,
          child_id: updates.childId
        });
      }
    }
  },

  async updateRecurringTemplate(
    user: User,
    account: Account,
    templateId: string,
    updates: Partial<{
      amount: number;
      description: string;
      category: string;
      paidById: string;
      splitEqually: boolean;
      frequency: string;
      hasEndDate: boolean;
      endDate: string | null;
      isIndexLinked: boolean;
      baseAmount: number | null;
      baseIndexPeriod: string | null;
      indexUpdateFrequency: string | null;
      floorEnabled: boolean | null;
    }>
  ): Promise<{ isPending: boolean }> {
    // 1. Fetch current template values
    const { data: current, error: fetchError } = await supabase
      .from('expenses')
      .select('amount, description, category, paid_by_id, split_equally, pending_changes, status')
      .eq('id', templateId)
      .eq('account_id', account.id)
      .single();

    if (fetchError || !current) {
      console.error('Error fetching template:', fetchError);
      throw fetchError || new Error('Template not found');
    }

    // Check if this is a personal plan or self-expense (no approval needed)
    const isPersonalPlan = account.plan_slug === 'personal';
    let hasOnlyVirtualPartner = false;
    if (account.virtual_partner_name && account.virtual_partner_id) {
      const { count } = await supabase
        .from('account_members')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', account.id);
      hasOnlyVirtualPartner = (count ?? 0) < 2;
    }
    const paidById = updates.paidById ?? current.paid_by_id;
    const needsApproval = !isPersonalPlan && !hasOnlyVirtualPartner && user.id !== paidById;

    // 2. Build pending_changes from current (original) values
    // If already has pending_changes (double edit), preserve the ORIGINAL values
    const pendingChanges: Record<string, unknown> = current.pending_changes ?? {};

    if (updates.amount !== undefined && !('amount' in pendingChanges)) {
      pendingChanges.amount = current.amount;
    }
    if (updates.description !== undefined && !('description' in pendingChanges)) {
      pendingChanges.description = current.description;
    }
    if (updates.category !== undefined && !('category' in pendingChanges)) {
      pendingChanges.category = current.category;
    }
    if (updates.paidById !== undefined && !('paid_by_id' in pendingChanges)) {
      pendingChanges.paid_by_id = current.paid_by_id;
    }
    if (updates.splitEqually !== undefined && !('split_equally' in pendingChanges)) {
      pendingChanges.split_equally = current.split_equally;
    }

    // 3. Build update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.paidById !== undefined) updateData.paid_by_id = updates.paidById;
    if (updates.splitEqually !== undefined) updateData.split_equally = updates.splitEqually;
    if (updates.frequency !== undefined) updateData.frequency = updates.frequency;
    if (updates.hasEndDate !== undefined) updateData.has_end_date = updates.hasEndDate;
    if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
    if (updates.isIndexLinked !== undefined) updateData.is_index_linked = updates.isIndexLinked;
    if (updates.baseAmount !== undefined) updateData.base_amount = updates.baseAmount;
    if (updates.baseIndexPeriod !== undefined) updateData.base_index_period = updates.baseIndexPeriod;
    if (updates.indexUpdateFrequency !== undefined) updateData.index_update_frequency = updates.indexUpdateFrequency;
    if (updates.floorEnabled !== undefined) updateData.floor_enabled = updates.floorEnabled;

    if (needsApproval && current.status === 'approved') {
      // Template edit requiring approval
      updateData.pending_changes = pendingChanges;
      updateData.edited_by_id = user.id;
      updateData.status = 'pending';
      updateData.approved_by = null;
      updateData.approved_at = null;
    }
    // If template is already pending or doesn't need approval, just update fields directly

    const { error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', templateId)
      .eq('account_id', account.id);

    if (error) {
      console.error('Error updating recurring template:', error);
      throw error;
    }

    return { isPending: needsApproval && current.status === 'approved' };
  },

  async updateExpenseStatus(user: User, account: Account, expenseId: string, status: 'pending' | 'approved' | 'rejected' | 'paid'): Promise<{ hadPendingChanges: boolean }> {
    // Updating expense status

    // Check if expense has pending_changes before updating (for rollback detection)
    const { data: before } = await supabase
      .from('expenses')
      .select('pending_changes')
      .eq('id', expenseId)
      .eq('account_id', account.id)
      .single();

    const hadPendingChanges = !!before?.pending_changes;

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

    return { hadPendingChanges };
  },

  async approveAllRecurring(user: User, account: Account, expenseId: string): Promise<void> {
    // Approving expense and all future recurring
    
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
    // Adding child to account
    
    const { error } = await supabase
      .from('children')
      .insert({
        name: child.name,
        birth_date: child.birthDate,
        gender: child.gender || 'son',
        account_id: account.id,
        budget_limit: child.budgetLimit ?? null,
      });

    if (error) {
      console.error('Error adding child:', error);
      throw error;
    }
  },

  async updateRecurringActive(user: User, account: Account, expenseId: string, active: boolean): Promise<void> {
    const { error } = await supabase
      .from('expenses')
      .update({ recurring_active: active })
      .eq('id', expenseId)
      .eq('account_id', account.id)
      .eq('is_recurring', true)
      .is('recurring_parent_id', null);

    if (error) {
      console.error('Error updating recurring active:', error);
      throw error;
    }
  },

  async deleteExpense(user: User, account: Account, expenseId: string): Promise<void> {
    // Fetch receipt_id before deleting so we can clean up storage
    const { data: expense } = await supabase
      .from('expenses')
      .select('receipt_id')
      .eq('id', expenseId)
      .eq('account_id', account.id)
      .single();

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)
      .eq('account_id', account.id);

    if (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }

    // Clean up receipt from storage (best-effort, don't fail delete if this errors)
    if (expense?.receipt_id) {
      supabase.storage.from('receipts').remove([expense.receipt_id]).catch(err => {
        console.warn('Failed to clean up receipt from storage:', err);
      });
    }
  },

  async updateChild(user: User, account: Account, id: string, updates: Partial<Omit<Child, 'id'>>): Promise<void> {
    // Updating child in account
    
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

    if (updates.budgetLimit !== undefined) {
      updateData.budget_limit = updates.budgetLimit === 0 ? null : updates.budgetLimit;
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

  }
};
