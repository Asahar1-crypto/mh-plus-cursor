
import { toast } from 'sonner';
import { supabase } from './client';
import { Expense, Child } from '@/contexts/expense/types';
import { User } from '@/contexts/auth/types';

export const expenseService = {
  // Fetch all expenses for the current user
  getExpenses: async (user: User) => {
    try {
      if (!user) return [];
      
      console.log("Getting expenses for user:", user.id);
      
      // Get accounts the user is part of (either as owner or shared)
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('id')
        .or(`owner_id.eq.${user.id},shared_with_id.eq.${user.id}`);
      
      if (accountsError) {
        console.error("Error fetching accounts:", accountsError);
        throw accountsError;
      }
      
      if (!accountsData || accountsData.length === 0) {
        console.log("No accounts found for user:", user.id);
        return [];
      }
      
      console.log("Found accounts:", accountsData);
      const accountIds = accountsData.map(acc => acc.id);
      
      // Get expenses for those accounts
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          profiles:paid_by_id (name),
          children:expense_children (
            child:child_id (
              id,
              name
            )
          )
        `)
        .in('account_id', accountIds);
      
      if (error) {
        console.error("Error fetching expenses:", error);
        throw error;
      }
      
      if (!data) {
        console.log("No expenses found for accounts:", accountIds);
        return [];
      }

      console.log("Raw expenses data:", data);
      
      // Transform data to match our app's Expense type
      const expenses: Expense[] = data.map(exp => {
        // Get child info if available
        let childId = null;
        let childName = null;
        
        if (exp.children && exp.children.length > 0 && exp.children[0].child) {
          childId = exp.children[0].child.id;
          childName = exp.children[0].child.name;
        }
        
        return {
          id: exp.id,
          amount: exp.amount,
          description: exp.description,
          date: exp.date,
          category: exp.category || '',
          createdBy: exp.paid_by_id,
          creatorName: exp.profiles?.name || 'Unknown',
          status: exp.status as 'pending' | 'approved' | 'rejected' | 'paid',
          receipt: exp.receipt_url || undefined,
          childId: childId,
          childName: childName,
          isRecurring: false, // TODO: Add recurring expense support
          includeInMonthlyBalance: true
        };
      });
      
      console.log(`Transformed ${expenses.length} expenses`);
      return expenses;
    } catch (error: any) {
      console.error('Failed to fetch expenses:', error);
      toast.error('לא ניתן היה להביא את ההוצאות, אנא נסה שוב מאוחר יותר');
      return [];
    }
  },
  
  // Add a new expense
  addExpense: async (expense: Omit<Expense, 'id' | 'createdBy' | 'creatorName' | 'status' | 'approvedBy' | 'approvedAt'>, user: User) => {
    try {
      if (!user) {
        toast.error('יש להתחבר כדי להוסיף הוצאה');
        throw new Error('User not authenticated');
      }
      
      // Get the first account the user is part of
      // In a real app, you might want to let the user choose which account to add the expense to
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('id')
        .or(`owner_id.eq.${user.id},shared_with_id.eq.${user.id}`)
        .limit(1);
      
      if (accountsError) throw accountsError;
      
      let accountId;
      
      if (!accountsData || accountsData.length === 0) {
        // Create a new account if the user doesn't have one
        const { data: newAccount, error: newAccountError } = await supabase
          .from('accounts')
          .insert({
            name: `משפחת ${user.name}`,
            owner_id: user.id
          })
          .select()
          .single();
        
        if (newAccountError) throw newAccountError;
        accountId = newAccount.id;
      } else {
        accountId = accountsData[0].id;
      }
      
      // Insert the expense
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          account_id: accountId,
          amount: expense.amount,
          description: expense.description,
          date: expense.date,
          category: expense.category,
          paid_by_id: user.id,
          status: 'pending',
          receipt_url: expense.receipt
        })
        .select('*')
        .single();
      
      if (error) throw error;
      
      // If there's a child associated with the expense, create the relationship
      if (expense.childId) {
        const { error: childRelError } = await supabase
          .from('expense_children')
          .insert({
            expense_id: data.id,
            child_id: expense.childId
          });
        
        if (childRelError) throw childRelError;
      }
      
      toast.success('ההוצאה נוספה בהצלחה');
      return data;
    } catch (error: any) {
      console.error('Failed to add expense:', error);
      toast.error('הוספת ההוצאה נכשלה, אנא נסה שוב');
      throw error;
    }
  },
  
  // Get all children for the user's accounts
  getChildren: async (user: User) => {
    try {
      if (!user) return [];
      
      // Get accounts the user is part of
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('id')
        .or(`owner_id.eq.${user.id},shared_with_id.eq.${user.id}`);
      
      if (accountsError) throw accountsError;
      if (!accountsData || accountsData.length === 0) return [];
      
      const accountIds = accountsData.map(acc => acc.id);
      
      // Get children for those accounts
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .in('account_id', accountIds);
      
      if (error) throw error;
      if (!data) return [];
      
      // Transform data to match our app's Child type
      const children: Child[] = data.map(child => ({
        id: child.id,
        name: child.name,
        birthDate: child.birth_date || new Date().toISOString().split('T')[0]
      }));
      
      return children;
    } catch (error: any) {
      console.error('Failed to fetch children:', error);
      toast.error('לא ניתן היה להביא את רשימת הילדים, אנא נסה שוב מאוחר יותר');
      return [];
    }
  },
  
  // Add a new child
  addChild: async (child: Omit<Child, 'id'>, user: User) => {
    try {
      if (!user) {
        toast.error('יש להתחבר כדי להוסיף ילד/ה');
        throw new Error('User not authenticated');
      }
      
      console.log("Adding child for user:", user.id, "name:", user.name);
      
      // Get the first account the user owns or is part of
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('id')
        .or(`owner_id.eq.${user.id},shared_with_id.eq.${user.id}`)
        .limit(1);
      
      if (accountsError) {
        console.error("Error fetching accounts:", accountsError);
        throw accountsError;
      }
      
      let accountId;
      
      if (!accountsData || accountsData.length === 0) {
        console.log("No accounts found, creating a new one");
        // Create a new account if the user doesn't have one
        const { data: newAccount, error: newAccountError } = await supabase
          .from('accounts')
          .insert({
            name: `משפחת ${user.name}`,
            owner_id: user.id
          })
          .select()
          .single();
        
        if (newAccountError) {
          console.error("Error creating account:", newAccountError);
          throw newAccountError;
        }
        
        console.log("Created new account:", newAccount.id);
        accountId = newAccount.id;
      } else {
        console.log("Using existing account:", accountsData[0].id);
        accountId = accountsData[0].id;
      }
      
      console.log("Adding child to account:", accountId);
      
      // Insert the child
      const { data, error } = await supabase
        .from('children')
        .insert({
          account_id: accountId,
          name: child.name,
          birth_date: child.birthDate
        })
        .select()
        .single();
      
      if (error) {
        console.error("Error adding child:", error);
        throw error;
      }
      
      return {
        id: data.id,
        name: data.name,
        birthDate: data.birth_date || new Date().toISOString().split('T')[0]
      };
    } catch (error: any) {
      console.error('Failed to add child:', error);
      throw new Error(error.message || 'הוספת הילד/ה נכשלה, אנא נסה שוב');
    }
  },
  
  // Update an expense's status
  updateExpenseStatus: async (id: string, status: 'pending' | 'approved' | 'rejected' | 'paid', user: User) => {
    try {
      if (!user) {
        toast.error('יש להתחבר כדי לעדכן סטטוס הוצאה');
        throw new Error('User not authenticated');
      }
      
      // Update the status
      const { error } = await supabase
        .from('expenses')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
      
      const statusMessages = {
        approved: 'ההוצאה אושרה בהצלחה',
        rejected: 'ההוצאה נדחתה',
        paid: 'ההוצאה סומנה כשולמה',
        pending: 'סטטוס ההוצאה עודכן בהצלחה'
      };
      
      toast.success(statusMessages[status]);
    } catch (error: any) {
      console.error('Failed to update expense status:', error);
      toast.error('עדכון סטטוס ההוצאה נכשל, אנא נסה שוב');
      throw error;
    }
  },
  
  // Upload a receipt for an expense
  uploadReceipt: async (expenseId: string, receiptUrl: string, user: User) => {
    try {
      if (!user) {
        toast.error('יש להתחבר כדי להעלות קבלה');
        throw new Error('User not authenticated');
      }
      
      const { error } = await supabase
        .from('expenses')
        .update({ receipt_url: receiptUrl })
        .eq('id', expenseId);
      
      if (error) throw error;
      
      toast.success('הקבלה הועלתה בהצלחה');
    } catch (error: any) {
      console.error('Failed to upload receipt:', error);
      toast.error('העלאת הקבלה נכשלה, אנא נסה שוב');
      throw error;
    }
  }
};
