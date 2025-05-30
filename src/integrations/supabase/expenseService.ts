
import { supabase } from './client';
import { Expense, Child } from '@/contexts/expense/types';
import { User } from '@/contexts/AuthContext';

export const expenseService = {
  async getExpenses(user: User): Promise<Expense[]> {
    console.log('Getting expenses for user:', user.id);
    
    // Get user's current account to determine which expenses to fetch
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.log('No session found');
      return [];
    }
    
    // Get user's current account
    const { data: profile } = await supabase
      .from('profiles')
      .select('selected_account_id')
      .eq('id', user.id)
      .single();
    
    let accountIds: string[] = [];
    
    // Get owned accounts
    const { data: ownedAccounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('owner_id', user.id);
    
    if (ownedAccounts) {
      accountIds.push(...ownedAccounts.map(acc => acc.id));
    }
    
    // Get shared accounts  
    const { data: sharedAccounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('shared_with_id', user.id);
    
    if (sharedAccounts) {
      accountIds.push(...sharedAccounts.map(acc => acc.id));
    }
    
    console.log('Found accounts:', accountIds);
    
    if (accountIds.length === 0) {
      console.log('No accounts found for user');
      return [];
    }
    
    // Fetch expenses from all accounts the user has access to
    const { data: rawExpenses, error } = await supabase
      .from('expenses')
      .select(`
        *,
        expense_children!inner(
          child_id,
          children!inner(
            name
          )
        )
      `)
      .in('account_id', accountIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching expenses:', error);
      throw error;
    }

    console.log('Raw expenses data:', rawExpenses);

    if (!rawExpenses || rawExpenses.length === 0) {
      console.log('No expenses found');
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
        createdBy: expense.paid_by_id,
        creatorName: 'Unknown', // We'll need to join with profiles to get this
        status: expense.status as 'pending' | 'approved' | 'rejected' | 'paid',
        receipt: expense.receipt_url,
        isRecurring: false, // Default value, can be updated based on your schema
        includeInMonthlyBalance: true // Default value
      };
    });

    console.log(`Transformed ${transformedExpenses.length} expenses`);
    return transformedExpenses;
  },

  async getChildren(user: User): Promise<Child[]> {
    console.log('Getting children for user:', user.id);
    
    // Get all account IDs that the user has access to
    let accountIds: string[] = [];
    
    // Get owned accounts
    const { data: ownedAccounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('owner_id', user.id);
    
    if (ownedAccounts) {
      accountIds.push(...ownedAccounts.map(acc => acc.id));
    }
    
    // Get shared accounts  
    const { data: sharedAccounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('shared_with_id', user.id);
    
    if (sharedAccounts) {
      accountIds.push(...sharedAccounts.map(acc => acc.id));
    }
    
    if (accountIds.length === 0) {
      console.log('No accounts found for user');
      return [];
    }
    
    const { data: children, error } = await supabase
      .from('children')
      .select('*')
      .in('account_id', accountIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching children:', error);
      throw error;
    }

    if (!children || children.length === 0) {
      console.log('No children found');
      return [];
    }

    return children.map((child: any) => ({
      id: child.id,
      name: child.name,
      birthDate: child.birth_date
    }));
  },

  async addExpense(user: User, expense: Omit<Expense, 'id' | 'createdBy' | 'creatorName' | 'status'>): Promise<void> {
    // Get user's active account
    const { data: profile } = await supabase
      .from('profiles')
      .select('selected_account_id')
      .eq('id', user.id)
      .single();
    
    // Determine which account to use
    let accountId = profile?.selected_account_id;
    
    if (!accountId) {
      // If no selected account, get the first available account
      const { data: ownedAccounts } = await supabase
        .from('accounts')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1);
      
      if (ownedAccounts && ownedAccounts.length > 0) {
        accountId = ownedAccounts[0].id;
      } else {
        // Check shared accounts
        const { data: sharedAccounts } = await supabase
          .from('accounts')
          .select('id')
          .eq('shared_with_id', user.id)
          .limit(1);
        
        if (sharedAccounts && sharedAccounts.length > 0) {
          accountId = sharedAccounts[0].id;
        }
      }
    }
    
    if (!accountId) {
      throw new Error('No account found to add expense to');
    }

    const { data: newExpense, error } = await supabase
      .from('expenses')
      .insert({
        amount: expense.amount,
        description: expense.description,
        date: expense.date,
        category: expense.category,
        account_id: accountId,
        paid_by_id: user.id,
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

  async addChild(user: User, child: Omit<Child, 'id'>): Promise<void> {
    // Get user's active account
    const { data: profile } = await supabase
      .from('profiles')
      .select('selected_account_id')
      .eq('id', user.id)
      .single();
    
    // Determine which account to use
    let accountId = profile?.selected_account_id;
    
    if (!accountId) {
      // If no selected account, get the first available account
      const { data: ownedAccounts } = await supabase
        .from('accounts')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1);
      
      if (ownedAccounts && ownedAccounts.length > 0) {
        accountId = ownedAccounts[0].id;
      } else {
        // Check shared accounts
        const { data: sharedAccounts } = await supabase
          .from('accounts')
          .select('id')
          .eq('shared_with_id', user.id)
          .limit(1);
        
        if (sharedAccounts && sharedAccounts.length > 0) {
          accountId = sharedAccounts[0].id;
        }
      }
    }
    
    if (!accountId) {
      throw new Error('No account found to add child to');
    }

    const { error } = await supabase
      .from('children')
      .insert({
        name: child.name,
        birth_date: child.birthDate,
        account_id: accountId
      });

    if (error) {
      console.error('Error adding child:', error);
      throw error;
    }
  }
};
