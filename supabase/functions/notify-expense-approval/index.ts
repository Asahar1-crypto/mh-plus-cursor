import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const vonageApiKey = Deno.env.get('VONAGE_API_KEY');
    const vonageApiSecret = Deno.env.get('VONAGE_API_SECRET');
    const vonageFromNumber = Deno.env.get('VONAGE_FROM_NUMBER');

    // 🔒 SECURITY: Verify JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('❌ No authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });

    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;

    if (claimsError || !userId) {
      console.error('❌ Authentication failed:', claimsError?.message);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ User authenticated:', userId);

    // Service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { expense_id, account_id } = await req.json();
    console.log(`📩 Notify expense approval: expense_id=${expense_id}, account_id=${account_id}`);

    if (!expense_id || !account_id) {
      return new Response(
        JSON.stringify({ error: 'expense_id and account_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 🔒 SECURITY: Verify user is a member of the requested account
    const { data: isMember, error: memberError } = await supabase.rpc(
      'is_account_member',
      { user_uuid: userId, account_uuid: account_id }
    );

    if (memberError || !isMember) {
      console.error('❌ Access denied or membership check error');
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get account details
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('sms_notifications_enabled, name')
      .eq('id', account_id)
      .single();

    if (accountError || !account) {
      console.error('Account not found:', accountError);
      return new Response(
        JSON.stringify({ error: 'Account not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Account: "${account.name}", SMS enabled: ${account.sms_notifications_enabled}`);

    // Get expense details
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select('id, amount, description, paid_by_id, status, created_by_id')
      .eq('id', expense_id)
      .single();

    if (expenseError || !expense) {
      console.error('Expense not found:', expenseError);
      return new Response(
        JSON.stringify({ error: 'Expense not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Expense: status=${expense.status}, amount=${expense.amount}, paid_by=${expense.paid_by_id}, created_by=${expense.created_by_id}`);

    // Only send notification for pending expenses
    if (expense.status !== 'pending') {
      console.log(`⚠️ Expense is "${expense.status}" not "pending" - skipping`);
      return new Response(
        JSON.stringify({ message: `Expense is ${expense.status}`, skipped: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the person who should be notified:
    // The expense was created by one person but paid_by is someone else.
    // We want to notify the person who DIDN'T create the expense - i.e., the one who needs to approve.
    // In the current logic, paid_by_id is the person who "owes" - so we notify all members except the creator.
    const { data: members, error: membersError } = await supabase
      .from('account_members')
      .select('user_id')
      .eq('account_id', account_id)
      .neq('user_id', expense.created_by_id);

    if (membersError || !members || members.length === 0) {
      console.log('⚠️ No other members to notify');
      return new Response(
        JSON.stringify({ message: 'No other members to notify', skipped: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const recipientUserId = members[0].user_id;
    console.log(`📤 Recipient: ${recipientUserId}`);

    // Get recipient's profile
    const { data: recipientProfile, error: profileError } = await supabase
      .from('profiles')
      .select('name, phone_e164, phone_number')
      .eq('id', recipientUserId)
      .single();

    if (profileError || !recipientProfile) {
      console.error('Recipient profile not found:', profileError);
      return new Response(
        JSON.stringify({ error: 'Recipient not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the creator's name for the notification message
    const { data: creatorProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', expense.created_by_id)
      .single();

    const creatorName = creatorProfile?.name || 'משתמש';
    const recipientName = recipientProfile.name || 'משתמש';
    const amount = expense.amount.toLocaleString('he-IL');
    const description = expense.description || 'הוצאה';
    const appUrl = 'https://hchmfsilgfrzhenafbzi.lovableproject.com';

    // ============================================================
    // 1. PUSH NOTIFICATION
    // ============================================================
    let pushResult: { success: boolean; reason?: string; fallback?: string } = { success: false, reason: 'not_attempted' };
    try {
      const pushPayload = {
        userId: recipientUserId,
        accountId: account_id,
        type: 'expense_pending_approval',
        title: `הוצאה חדשה לאישור`,
        body: `${creatorName} הוסיף/ה הוצאה: ${amount} ₪ - ${description}`,
        data: { expenseId: expense_id },
        actionUrl: `${appUrl}/expenses`,
      };

      console.log('📲 Sending push notification...');
      const pushResponse = await supabase.functions.invoke('send-push-notification', {
        body: pushPayload,
      });

      if (pushResponse.error) {
        console.error('❌ Push error:', pushResponse.error);
        pushResult = { success: false, reason: pushResponse.error.message };
      } else {
        pushResult = pushResponse.data || { success: true };
        console.log('📲 Push result:', JSON.stringify(pushResult));
      }
    } catch (pushError) {
      console.error('❌ Push exception:', pushError);
      pushResult = { success: false, reason: 'exception' };
    }

    // ============================================================
    // 2. SMS NOTIFICATION
    // Send SMS if:
    // - SMS is enabled for the account, OR
    // - Push notification failed (fallback)
    // ============================================================
    const pushFailed = !pushResult.success || pushResult.fallback === 'sms';
    const shouldSendSMS = account.sms_notifications_enabled || pushFailed;

    let smsResult: { success: boolean; messageId?: string; error?: string; reason?: string } = { success: false, reason: 'not_attempted' };

    if (!shouldSendSMS) {
      console.log('📵 SMS not needed (push succeeded and SMS disabled)');
      smsResult = { success: false, reason: 'not_needed' };
    } else {
      console.log(`📱 Will send SMS (sms_enabled=${account.sms_notifications_enabled}, push_failed=${pushFailed})`);

      // Check if SMS already sent
      const { data: existingNotification } = await supabase
        .from('expense_notifications')
        .select('id')
        .eq('expense_id', expense_id)
        .eq('notification_type', 'sms')
        .single();

      if (existingNotification) {
        console.log('📱 SMS already sent for this expense');
        smsResult = { success: false, reason: 'already_sent' };
      } else {
        const recipientPhone = recipientProfile.phone_e164 || recipientProfile.phone_number;

        if (!recipientPhone) {
          console.log('📱 No phone number for recipient');
          smsResult = { success: false, error: 'No phone number' };
        } else if (!vonageApiKey || !vonageApiSecret || !vonageFromNumber) {
          console.error('📱 Vonage not configured');
          smsResult = { success: false, error: 'SMS service not configured' };
        } else {
          const smsMessage = `היי ${recipientName},\n${creatorName} הוסיף/ה הוצאה חדשה לאישור: ${amount} ₪\n${description}\nלאישור: ${appUrl}/expenses`;

          console.log(`📱 Sending SMS to ${recipientPhone}...`);
          const cleanPhone = recipientPhone.replace(/^\+/, '');

          try {
            const vonageResponse = await fetch('https://rest.nexmo.com/sms/json', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                api_key: vonageApiKey,
                api_secret: vonageApiSecret,
                from: vonageFromNumber,
                to: cleanPhone,
                text: smsMessage,
                type: 'unicode'
              }),
            });

            const vonageResult = await vonageResponse.json();
            console.log('📱 Vonage response:', JSON.stringify(vonageResult));

            if (vonageResult.messages?.[0]?.status === '0') {
              await supabase.from('expense_notifications').insert({
                expense_id,
                notification_type: 'sms',
                recipient_user_id: recipientUserId,
                recipient_phone: recipientPhone,
                status: 'sent'
              });
              console.log('✅ SMS sent successfully');
              smsResult = { success: true, messageId: vonageResult.messages[0]['message-id'] };
            } else {
              const errorText = vonageResult.messages?.[0]?.['error-text'] || 'Unknown error';
              await supabase.from('expense_notifications').insert({
                expense_id,
                notification_type: 'sms',
                recipient_user_id: recipientUserId,
                recipient_phone: recipientPhone,
                status: 'failed',
                error_message: errorText
              });
              console.error('❌ SMS error:', errorText);
              smsResult = { success: false, error: errorText };
            }
          } catch (smsError) {
            console.error('❌ SMS exception:', smsError);
            smsResult = { success: false, error: 'Exception sending SMS' };
          }
        }
      }
    }

    console.log(`📊 Final: push=${JSON.stringify(pushResult)}, sms=${JSON.stringify(smsResult)}`);

    return new Response(
      JSON.stringify({ 
        success: pushResult.success || smsResult.success,
        push: pushResult,
        sms: smsResult,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Notify expense error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
