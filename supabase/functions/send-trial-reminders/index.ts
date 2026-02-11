import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

/**
 * Send Trial Reminders
 * Cron job that runs daily and sends push notifications to accounts
 * whose trial is about to expire (5 days and 1 day before).
 * 
 * Also handles trial expiration by updating expired trials.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const cronSecret = Deno.env.get('CRON_SECRET');

    // Security: check cron secret or super-admin JWT
    const cronSecretHeader = req.headers.get('X-Cron-Secret');
    const authHeader = req.headers.get('Authorization');

    let isAuthorized = false;

    // Method 1: Cron secret
    if (cronSecretHeader && cronSecret && cronSecretHeader === cronSecret) {
      isAuthorized = true;
      console.log('✅ Authenticated via cron secret');
    }
    // Method 2: Super-admin JWT
    else if (authHeader?.startsWith('Bearer ')) {
      const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseAuth.auth.getUser(token);
      
      if (user) {
        const { data: profile } = await supabaseAuth
          .from('profiles')
          .select('is_super_admin')
          .eq('id', user.id)
          .single();
        
        if (profile?.is_super_admin) {
          isAuthorized = true;
          console.log('✅ Authenticated via super-admin JWT');
        }
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. First, update any expired trials
    await supabase.rpc('update_expired_trials');
    console.log('✅ Updated expired trials');

    // 2. Find accounts with trials expiring in 5 days
    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
    const fiveDaysStart = new Date(fiveDaysFromNow);
    fiveDaysStart.setHours(0, 0, 0, 0);
    const fiveDaysEnd = new Date(fiveDaysFromNow);
    fiveDaysEnd.setHours(23, 59, 59, 999);

    const { data: fiveDayAccounts } = await supabase
      .from('accounts')
      .select('id, name, owner_id, trial_ends_at')
      .eq('subscription_status', 'trial')
      .gte('trial_ends_at', fiveDaysStart.toISOString())
      .lte('trial_ends_at', fiveDaysEnd.toISOString());

    console.log(`📅 Found ${fiveDayAccounts?.length || 0} accounts expiring in 5 days`);

    // 3. Find accounts with trials expiring tomorrow
    const oneDayFromNow = new Date();
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
    const oneDayStart = new Date(oneDayFromNow);
    oneDayStart.setHours(0, 0, 0, 0);
    const oneDayEnd = new Date(oneDayFromNow);
    oneDayEnd.setHours(23, 59, 59, 999);

    const { data: oneDayAccounts } = await supabase
      .from('accounts')
      .select('id, name, owner_id, trial_ends_at')
      .eq('subscription_status', 'trial')
      .gte('trial_ends_at', oneDayStart.toISOString())
      .lte('trial_ends_at', oneDayEnd.toISOString());

    console.log(`⏰ Found ${oneDayAccounts?.length || 0} accounts expiring tomorrow`);

    let notificationsSent = 0;
    let errors = 0;

    // Helper: send notification to all members of an account
    const notifyAccountMembers = async (
      accountId: string,
      accountName: string,
      title: string,
      body: string,
      daysLeft: number
    ) => {
      // Get all members of this account
      const { data: members } = await supabase
        .from('account_members')
        .select('user_id')
        .eq('account_id', accountId);

      if (!members || members.length === 0) return;

      // Check if we already sent this reminder today (avoid duplicates)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: existingLogs } = await supabase
        .from('notification_logs')
        .select('id')
        .eq('account_id', accountId)
        .eq('notification_type', 'subscription_expiring')
        .gte('created_at', today.toISOString())
        .limit(1);

      if (existingLogs && existingLogs.length > 0) {
        console.log(`⏭️ Already sent reminder today for account ${accountId}`);
        return;
      }

      for (const member of members) {
        try {
          await supabase.functions.invoke('send-push-notification', {
            body: {
              userId: member.user_id,
              accountId: accountId,
              type: 'subscription_expiring',
              title,
              body,
              data: {
                daysLeft: String(daysLeft),
                accountName,
              },
              actionUrl: '/pricing',
            },
          });
          notificationsSent++;
          console.log(`📲 Sent trial reminder to user ${member.user_id} (${daysLeft} days left)`);
        } catch (err) {
          errors++;
          console.error(`❌ Failed to send to ${member.user_id}:`, err);
        }
      }
    };

    // 4. Send 5-day reminders
    for (const account of (fiveDayAccounts || [])) {
      await notifyAccountMembers(
        account.id,
        account.name,
        'תקופת הניסיון עומדת להסתיים',
        `נשארו 5 ימים לתקופת הניסיון של "${account.name}". בחר תוכנית כדי להמשיך להשתמש.`,
        5
      );
    }

    // 5. Send 1-day reminders
    for (const account of (oneDayAccounts || [])) {
      await notifyAccountMembers(
        account.id,
        account.name,
        'תקופת הניסיון מסתיימת מחר!',
        `מחר נגמרת תקופת הניסיון של "${account.name}". בחר תוכנית עכשיו כדי לא לאבד גישה.`,
        1
      );
    }

    const summary = {
      success: true,
      fiveDayAccounts: fiveDayAccounts?.length || 0,
      oneDayAccounts: oneDayAccounts?.length || 0,
      notificationsSent,
      errors,
      timestamp: new Date().toISOString(),
    };

    console.log('📊 Trial reminders summary:', JSON.stringify(summary));

    return new Response(
      JSON.stringify(summary),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Trial reminders error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
