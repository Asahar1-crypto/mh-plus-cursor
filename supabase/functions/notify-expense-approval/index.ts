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
      .select('name')
      .eq('id', account_id)
      .single();

    if (accountError || !account) {
      console.error('Account not found:', accountError);
      return new Response(
        JSON.stringify({ error: 'Account not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Account: "${account.name}"`);

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

    // Get recipient's notification preferences (מה שהמשתמש הגדיר ב"ערוצי התראות")
    const { data: recipientPrefs } = await supabase
      .from('notification_preferences')
      .select('sms_enabled, email_enabled, preferences')
      .eq('user_id', recipientUserId)
      .eq('account_id', account_id)
      .maybeSingle();

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
    const appUrl = Deno.env.get('APP_URL') || 'https://mhplus.online';

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
        actionUrl: appUrl,
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
    // 2. SMS NOTIFICATION (fallback only)
    // SMS is sent only when push could not reach the user:
    //   - no active device tokens (push returns { fallback: 'sms' })
    //   - push globally disabled for the user
    //   - push threw an exception
    // OTP, login, registration, password reset are always sent - handled elsewhere.
    // ============================================================
    const shouldSendSMS = recipientPrefs?.sms_enabled ?? true; // user's channel preference

    // Determine whether push actually reached the user
    const noActiveTokens = pushResult?.fallback === 'sms';
    const pushGloballyDisabled = pushResult?.success === false && pushResult?.reason === 'Push notifications disabled';
    const pushException = pushResult?.success === false && pushResult?.reason === 'exception';
    const shouldAttemptSms = (noActiveTokens || pushGloballyDisabled || pushException) && shouldSendSMS;

    let smsResult: { success: boolean; messageId?: string; error?: string; reason?: string } = { success: false, reason: 'not_attempted' };

    if (!shouldAttemptSms) {
      const skipReason = !shouldSendSMS ? 'sms_disabled_by_user' : 'push_delivered';
      console.log(`📵 SMS skipped (${skipReason})`);
      smsResult = { success: false, reason: skipReason };
    } else {
      console.log(`📱 Push did not reach user – attempting SMS fallback`);

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
          const smsMessage = `היי ${recipientName},\n${creatorName} הוסיף/ה הוצאה חדשה לאישור: ${amount} ₪\n${description}\nלאישור: ${appUrl}`;

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

    // ============================================================
    // 3. EMAIL NOTIFICATION
    // Independent channel – sent alongside push (not a fallback).
    // Respects: email_enabled master toggle + per-type email preference.
    // ============================================================
    const emailMasterEnabled = recipientPrefs?.email_enabled ?? true;
    const perTypeEmailEnabled = (recipientPrefs?.preferences as Record<string, { push: boolean; sms: boolean; email: boolean }> | null)?.['expense_pending_approval']?.email ?? true;
    const shouldSendEmail = emailMasterEnabled && perTypeEmailEnabled;

    let emailResult: { success: boolean; error?: string; reason?: string } = { success: false, reason: 'not_attempted' };

    if (!shouldSendEmail) {
      console.log('📧 Email skipped (disabled by user)');
      emailResult = { success: false, reason: 'email_disabled_by_user' };
    } else {
      // Get recipient email address from auth
      const { data: authUserData, error: authUserError } = await supabase.auth.admin.getUserById(recipientUserId);
      const recipientEmail = authUserData?.user?.email;

      if (authUserError || !recipientEmail) {
        console.log('📧 No email address for recipient');
        emailResult = { success: false, reason: 'no_email_address' };
      } else {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl;">
            <h2 style="color: #4a5568;">הוצאה חדשה ממתינה לאישורך</h2>
            <p>היי ${recipientName},</p>
            <p><strong>${creatorName}</strong> הוסיף/ה הוצאה חדשה הדורשת את אישורך:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr style="background: #f7fafc;">
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">סכום</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">${amount} ₪</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">תיאור</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">${description}</td>
              </tr>
              <tr style="background: #f7fafc;">
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">חשבון</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">${account.name}</td>
              </tr>
            </table>
            <p style="margin: 25px 0;">
              <a href="${appUrl}" style="background-color: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">לאישור ההוצאה</a>
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #718096; font-size: 14px;">מחציות פלוס - ניהול הוצאות משותפות</p>
          </div>
        `;

        console.log(`📧 Sending email to ${recipientEmail}...`);
        try {
          const emailResponse = await supabase.functions.invoke('send-email', {
            body: {
              to: recipientEmail,
              subject: `הוצאה חדשה לאישור: ${amount} ₪ - ${description}`,
              html: emailHtml,
            },
          });

          if (emailResponse.error) {
            console.error('❌ Email error:', emailResponse.error);
            emailResult = { success: false, error: emailResponse.error.message };
          } else if (emailResponse.data?.warning) {
            console.warn('⚠️ Email warning (SendGrid):', emailResponse.data.warning);
            emailResult = { success: false, error: emailResponse.data.warning };
          } else {
            console.log('✅ Email sent successfully');
            emailResult = { success: true };
          }
        } catch (emailError) {
          console.error('❌ Email exception:', emailError);
          emailResult = { success: false, error: 'Exception sending email' };
        }

        // Log to notification_logs regardless of outcome
        await supabase.from('notification_logs').insert({
          user_id: recipientUserId,
          account_id: account_id,
          notification_type: 'expense_pending_approval',
          channel: 'email',
          title: `הוצאה חדשה לאישור: ${amount} ₪ - ${description}`,
          body: `${creatorName} הוסיף/ה הוצאה חדשה הדורשת את אישורך`,
          data: { expenseId: expense_id },
          status: emailResult.success ? 'sent' : 'failed',
          error_message: emailResult.error || null,
        });
      }
    }

    console.log(`📊 Final: push=${JSON.stringify(pushResult)}, sms=${JSON.stringify(smsResult)}, email=${JSON.stringify(emailResult)}`);

    return new Response(
      JSON.stringify({
        success: pushResult.success || smsResult.success || emailResult.success,
        push: pushResult,
        sms: smsResult,
        email: emailResult,
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
