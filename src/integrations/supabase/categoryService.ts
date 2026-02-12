import { supabase } from './client';
import { Account } from '@/contexts/auth/types';

export interface Category {
  id: string;
  account_id: string;
  name: string;
  color: string;
  sort_order: number;
}

export const categoryService = {
  async getCategories(account: Account): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('id, account_id, name, color, sort_order')
      .eq('account_id', account.id)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }

    return (data || []) as Category[];
  },

  async addCategory(account: Account, name: string, color = '#6366f1'): Promise<Category> {
    const maxOrder = await supabase
      .from('categories')
      .select('sort_order')
      .eq('account_id', account.id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const sortOrder = (maxOrder.data?.sort_order ?? 0) + 1;

    const { data, error } = await supabase
      .from('categories')
      .insert({ account_id: account.id, name, color, sort_order: sortOrder })
      .select()
      .single();

    if (error) {
      console.error('Error adding category:', error);
      throw error;
    }

    return data as Category;
  },

  async updateCategory(account: Account, id: string, updates: Partial<{ name: string; color: string; sort_order: number }>): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .eq('account_id', account.id);

    if (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  },

  async deleteCategory(account: Account, id: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('account_id', account.id);

    if (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  },
};
