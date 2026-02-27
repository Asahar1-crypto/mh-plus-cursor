import { supabase } from './client';

export interface ActivityLog {
  id: string;
  account_id: string;
  user_id: string | null;
  user_name: string;
  action: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const activityService = {
  async log(params: {
    accountId: string;
    userId: string;
    userName: string;
    action: string;
    description: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await supabase.from('account_activity_logs').insert({
        account_id: params.accountId,
        user_id: params.userId,
        user_name: params.userName,
        action: params.action,
        description: params.description,
        metadata: params.metadata ?? {},
      });
    } catch {
      // Non-critical — silently ignore logging failures
    }
  },

  async fetch(accountId: string, limit = 50): Promise<ActivityLog[]> {
    const { data, error } = await supabase
      .from('account_activity_logs')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data as ActivityLog[];
  },
};
