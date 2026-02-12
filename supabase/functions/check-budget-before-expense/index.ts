import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function budgetAppliesToCategory(b: {
  category: string | null;
  categories: string[] | null;
}, cat: string): boolean {
  if (b.categories && b.categories.length > 0) {
    return b.categories.includes(cat);
  }
  return b.category === cat;
}

function monthStart(month: number, year: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function monthEnd(month: number, year: number): string {
  const d = new Date(year, month, 0);
  return `${year}-${String(month).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    const { data: claims } = await anonClient.auth.getClaims(token);
    const userId = claims?.claims?.sub;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { accountId, category, amount, expenseDate } = await req.json();

    if (!accountId || !category || amount == null) {
      return new Response(
        JSON.stringify({ error: 'accountId, category, amount required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const amt = Number(amount);
    if (isNaN(amt) || amt < 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetDate = expenseDate ? new Date(expenseDate) : new Date();

    const { data: isMember } = await supabase.rpc('is_account_member', {
      user_uuid: userId,
      account_uuid: accountId,
    });
    if (!isMember) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const month = targetDate.getMonth() + 1;
    const year = targetDate.getFullYear();
    const monthStartStr = monthStart(month, year);
    const monthEndStr = monthEnd(month, year);

    const { data: allBudgets } = await supabase
      .from('budgets')
      .select('*')
      .eq('account_id', accountId);

    const budgets = (allBudgets || []).filter((b: { budget_type?: string; month?: number; year?: number; start_date?: string; end_date?: string }) => {
      if (b.budget_type === 'monthly') {
        return b.month === month && b.year === year;
      }
      if (!b.start_date) return false;
      const end = b.end_date ?? '9999-12-31';
      return b.start_date <= monthEndStr && end >= monthStartStr;
    }).filter((b: { category?: string; categories?: string[] }) => budgetAppliesToCategory(b, category));

    const budget = budgets.reduce((s: number, b: { monthly_amount: number }) => s + b.monthly_amount, 0);

    if (budget <= 0) {
      return new Response(
        JSON.stringify({ status: 'ok', budget: 0, spent: 0, newSpent: amt }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('account_id', accountId)
      .eq('category', category)
      .in('status', ['approved', 'paid'])
      .gte('date', monthStartStr)
      .lte('date', monthEndStr);

    const spent = (expenses || []).reduce((s: number, e: { amount: number }) => s + Number(e.amount || 0), 0);
    const newSpent = spent + amt;

    let status: 'ok' | 'warning_90' | 'exceeded' = 'ok';
    if (newSpent > budget) status = 'exceeded';
    else if (newSpent >= budget * 0.9) status = 'warning_90';

    const { data: members } = await supabase
      .from('account_members')
      .select('user_id')
      .eq('account_id', accountId);

    const notifType = status === 'exceeded' ? 'budget_exceeded' : 'budget_threshold_90';

    const { data: existingLogs } = await supabase
      .from('notification_logs')
      .select('id')
      .eq('account_id', accountId)
      .eq('notification_type', notifType)
      .gte('created_at', monthStartStr)
      .filter('data->>category', 'eq', category)
      .limit(1);
    const existingLog = existingLogs && existingLogs.length > 0 ? existingLogs[0] : null;

    if (status !== 'ok' && !existingLog && members && members.length > 0) {
      const title = status === 'exceeded' ? 'חרגת מהתקציב' : 'התקציב הגיע ל-90%';
      const body = status === 'exceeded'
        ? `קטגוריה "${category}" חרגה מהתקציב (₪${budget.toFixed(0)})`
        : `קטגוריה "${category}" הגיעה ל-90% מהתקציב (₪${budget.toFixed(0)})`;

      for (const m of members) {
        try {
          await supabase.functions.invoke('send-push-notification', {
            body: {
              userId: m.user_id,
              accountId,
              type: notifType,
              title,
              body,
              data: { category, month: String(month), year: String(year) },
              actionUrl: '/dashboard',
            },
          });
        } catch (e) {
          console.error('Push failed:', e);
        }
      }
    }

    return new Response(
      JSON.stringify({ status, budget, spent, newSpent }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('check-budget error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
