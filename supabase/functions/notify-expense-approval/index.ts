import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Escape user-provided strings before embedding in HTML */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

    // Get expense details (including pending_changes for template edits)
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select('id, amount, description, paid_by_id, status, created_by_id, pending_changes, edited_by_id, is_recurring, recurring_parent_id')
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

    // Determine if this is a template edit notification
    const isTemplateEdit = !!expense.pending_changes && !!expense.edited_by_id;
    const notificationType = isTemplateEdit ? 'expense_template_edit' : 'expense_pending_approval';

    // Idempotency check: skip if a notification for this expense was already sent
    // For template edits, use a different notification_type so re-notifications work
    const { data: existingNotification } = await supabase
      .from('notification_logs')
      .select('id')
      .eq('notification_type', notificationType)
      .eq('status', 'sent')
      .eq('data->>expenseId', expense_id)
      .limit(1)
      .maybeSingle();

    if (existingNotification) {
      console.log(`🔁 Notification already sent for expense ${expense_id} (${notificationType}), skipping`);
      return new Response(
        JSON.stringify({ skipped: true, reason: 'already_notified' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only send notification for pending expenses
    if (expense.status !== 'pending') {
      console.log(`⚠️ Expense is "${expense.status}" not "pending" - skipping`);
      return new Response(
        JSON.stringify({ message: `Expense is ${expense.status}`, skipped: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the person who should be notified:
    // For template edits: notify everyone except the editor (edited_by_id)
    // For new expenses: notify everyone except the creator (created_by_id)
    const initiatorId = isTemplateEdit ? expense.edited_by_id : expense.created_by_id;
    const { data: members, error: membersError } = await supabase
      .from('account_members')
      .select('user_id')
      .eq('account_id', account_id)
      .neq('user_id', initiatorId);

    if (membersError || !members || members.length === 0) {
      console.log('⚠️ No other members to notify');
      return new Response(
        JSON.stringify({ message: 'No other members to notify', skipped: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the initiator's name for the notification message
    const { data: initiatorProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', initiatorId)
      .single();

    const creatorName = initiatorProfile?.name || 'משתמש';
    const amount = expense.amount.toLocaleString('he-IL');
    const description = expense.description || 'הוצאה';
    const appUrl = Deno.env.get('APP_URL') || 'https://mhplus.online';

    // Build change summary for template edits
    let editSummary = '';
    if (isTemplateEdit && expense.pending_changes) {
      const changes: string[] = [];
      if (expense.pending_changes.amount !== undefined) {
        const oldAmount = Number(expense.pending_changes.amount).toLocaleString('he-IL');
        changes.push(`סכום: ₪${oldAmount} → ₪${amount}`);
      }
      if (expense.pending_changes.description !== undefined) {
        changes.push(`תיאור: ${expense.pending_changes.description} → ${description}`);
      }
      editSummary = changes.join(', ');
    }

    // HTML-escaped versions of user-provided data for email templates
    const safeCreatorName = escapeHtml(creatorName);
    const safeAmount = escapeHtml(amount);
    const safeDescription = escapeHtml(description);
    const safeAccountName = escapeHtml(account.name);
    const safeEditSummary = escapeHtml(editSummary);

    // ============================================================
    // Process ALL recipients
    // ============================================================
    const allResults: Array<{
      recipientUserId: string;
      push: { success: boolean; reason?: string; fallback?: string };
      sms: { success: boolean; messageId?: string; error?: string; reason?: string };
      email: { success: boolean; error?: string; reason?: string };
    }> = [];

    for (const member of members) {
      const recipientUserId = member.user_id;
      console.log(`📤 Processing recipient: ${recipientUserId}`);

      // Get recipient's profile
      const { data: recipientProfile, error: profileError } = await supabase
        .from('profiles')
        .select('name, phone_e164, phone_number')
        .eq('id', recipientUserId)
        .single();

      if (profileError || !recipientProfile) {
        console.error(`Recipient profile not found for ${recipientUserId}:`, profileError);
        allResults.push({
          recipientUserId,
          push: { success: false, reason: 'profile_not_found' },
          sms: { success: false, reason: 'profile_not_found' },
          email: { success: false, reason: 'profile_not_found' },
        });
        continue;
      }

      // Get recipient's notification preferences
      const { data: recipientPrefs } = await supabase
        .from('notification_preferences')
        .select('sms_enabled, email_enabled, preferences')
        .eq('user_id', recipientUserId)
        .eq('account_id', account_id)
        .maybeSingle();

      const recipientName = recipientProfile.name || 'משתמש';
      const safeRecipientName = escapeHtml(recipientName);

      // ============================================================
      // 1. PUSH NOTIFICATION
      // ============================================================
      let pushResult: { success: boolean; reason?: string; fallback?: string } = { success: false, reason: 'not_attempted' };
      try {
        const pushPayload = {
          userId: recipientUserId,
          accountId: account_id,
          type: notificationType,
          title: isTemplateEdit ? `עדכון הוצאה מתחדשת לאישור` : `הוצאה חדשה לאישור`,
          body: isTemplateEdit
            ? `${creatorName} עדכן/ה הוצאה מתחדשת: ${editSummary || description}`
            : `${creatorName} הוסיף/ה הוצאה: ${amount} ₪ - ${description}`,
          data: { expenseId: expense_id },
          actionUrl: appUrl,
        };

        console.log(`📲 Sending push notification to ${recipientUserId}...`);
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
      // ============================================================
      const shouldSendSMS = recipientPrefs?.sms_enabled ?? true;

      const noActiveTokens = pushResult?.fallback === 'sms';
      const pushGloballyDisabled = pushResult?.success === false && pushResult?.reason === 'Push notifications disabled';
      const pushException = pushResult?.success === false && pushResult?.reason === 'exception';
      const shouldAttemptSms = (noActiveTokens || pushGloballyDisabled || pushException) && shouldSendSMS;

      let smsResult: { success: boolean; messageId?: string; error?: string; reason?: string } = { success: false, reason: 'not_attempted' };

      if (!shouldAttemptSms) {
        const skipReason = !shouldSendSMS ? 'sms_disabled_by_user' : 'push_delivered';
        console.log(`📵 SMS skipped for ${recipientUserId} (${skipReason})`);
        smsResult = { success: false, reason: skipReason };
      } else {
        console.log(`📱 Push did not reach ${recipientUserId} – attempting SMS fallback`);

        // Check if SMS already sent for this recipient
        const { data: existingNotification } = await supabase
          .from('expense_notifications')
          .select('id')
          .eq('expense_id', expense_id)
          .eq('notification_type', 'sms')
          .eq('recipient_user_id', recipientUserId)
          .maybeSingle();

        if (existingNotification) {
          console.log(`📱 SMS already sent to ${recipientUserId} for this expense`);
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
            const smsMessage = isTemplateEdit
              ? `היי ${recipientName},\n${creatorName} עדכן/ה הוצאה מתחדשת: ${editSummary || description}\nלאישור: ${appUrl}`
              : `היי ${recipientName},\n${creatorName} הוסיף/ה הוצאה חדשה לאישור: ${amount} ₪\n${description}\nלאישור: ${appUrl}`;

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

              if (!vonageResult?.messages || !Array.isArray(vonageResult.messages) || vonageResult.messages.length === 0) {
                console.error('📱 Unexpected Vonage response structure:', JSON.stringify(vonageResult));
                await supabase.from('expense_notifications').insert({
                  expense_id,
                  notification_type: 'sms',
                  recipient_user_id: recipientUserId,
                  recipient_phone: recipientPhone,
                  status: 'failed',
                  error_message: 'Unexpected response from SMS provider'
                });
                smsResult = { success: false, error: 'Unexpected response from SMS provider' };
              } else if (vonageResult.messages[0]?.status === '0') {
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
      // ============================================================
      const emailMasterEnabled = recipientPrefs?.email_enabled ?? true;
      const perTypeEmailEnabled = (recipientPrefs?.preferences as Record<string, { push: boolean; sms: boolean; email: boolean }> | null)?.['expense_pending_approval']?.email ?? true;
      const shouldSendEmail = emailMasterEnabled && perTypeEmailEnabled;

      let emailResult: { success: boolean; error?: string; reason?: string } = { success: false, reason: 'not_attempted' };

      if (!shouldSendEmail) {
        console.log(`📧 Email skipped for ${recipientUserId} (disabled by user)`);
        emailResult = { success: false, reason: 'email_disabled_by_user' };
      } else {
        // Get recipient email address from auth
        const { data: authUserData, error: authUserError } = await supabase.auth.admin.getUserById(recipientUserId);
        const recipientEmail = authUserData?.user?.email;

        if (authUserError || !recipientEmail) {
          console.log(`📧 No email address for recipient ${recipientUserId}`);
          emailResult = { success: false, reason: 'no_email_address' };
        } else {
          const emailHtml = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Heebo', Arial, sans-serif; direction: rtl;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f4f8; padding: 24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

<!-- Header with gradient -->
<tr>
<td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 40px; text-align: center;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center">
<img src="https://mhplus.online/logo.png" alt="מחציות פלוס" width="48" height="48" style="display: block; margin: 0 auto 12px; border-radius: 12px;" />
<p style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; font-family: 'Heebo', Arial, sans-serif;">מחציות פלוס</p>
</td>
</tr>
</table>
</td>
</tr>

<!-- Body -->
<tr>
<td style="background-color: #ffffff; padding: 40px 40px 32px;">

<!-- Status pill -->
<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 28px;">
<tr>
<td style="background-color: #FFF3E0; border-radius: 50px; padding: 8px 20px;">
<span style="font-size: 15px; font-weight: 600; color: #E65100; font-family: 'Heebo', Arial, sans-serif;">&#x1F514; ${isTemplateEdit ? 'עדכון הוצאה מתחדשת לאישור' : 'הוצאה חדשה לאישור'}</span>
</td>
</tr>
</table>

<!-- Greeting -->
<p style="font-size: 17px; color: #2d3748; margin: 0 0 8px; font-family: 'Heebo', Arial, sans-serif;">היי ${safeRecipientName},</p>
<p style="font-size: 15px; color: #4a5568; margin: 0 0 28px; line-height: 1.6; font-family: 'Heebo', Arial, sans-serif;"><strong>${safeCreatorName}</strong> ${isTemplateEdit ? 'עדכן/ה הוצאה מתחדשת הדורשת את אישורך' : 'הוסיף/ה הוצאה חדשה הדורשת את אישורך'}:</p>
${isTemplateEdit && safeEditSummary ? `<p style="font-size: 14px; color: #E65100; margin: 0 0 16px; font-family: 'Heebo', Arial, sans-serif;">&#x1F4DD; ${safeEditSummary}</p>` : ''}

<!-- Expense details card -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; margin-bottom: 32px;">
<!-- Amount row -->
<tr>
<td style="padding: 24px 28px; text-align: center; border-bottom: 1px solid #e2e8f0;">
<p style="margin: 0 0 4px; font-size: 13px; color: #718096; font-family: 'Heebo', Arial, sans-serif;">סכום</p>
<p style="margin: 0; font-size: 36px; font-weight: 800; color: #0EA5E9; font-family: 'Heebo', Arial, sans-serif;">${safeAmount} &#8362;</p>
</td>
</tr>
<!-- Description row -->
<tr>
<td style="padding: 16px 28px; border-bottom: 1px solid #e2e8f0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="font-size: 13px; color: #718096; padding-bottom: 2px; font-family: 'Heebo', Arial, sans-serif;">תיאור</td>
</tr>
<tr>
<td style="font-size: 16px; color: #2d3748; font-weight: 600; font-family: 'Heebo', Arial, sans-serif;">${safeDescription}</td>
</tr>
</table>
</td>
</tr>
<!-- Account row -->
<tr>
<td style="padding: 16px 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="font-size: 13px; color: #718096; padding-bottom: 2px; font-family: 'Heebo', Arial, sans-serif;">חשבון</td>
</tr>
<tr>
<td style="font-size: 16px; color: #2d3748; font-weight: 600; font-family: 'Heebo', Arial, sans-serif;">${safeAccountName}</td>
</tr>
</table>
</td>
</tr>
</table>

<!-- CTA Button -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="padding-bottom: 8px;">
<a href="${appUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; font-size: 17px; font-weight: 700; text-decoration: none; padding: 16px 48px; border-radius: 50px; font-family: 'Heebo', Arial, sans-serif;">&#x2192; לאישור ההוצאה</a>
</td>
</tr>
</table>

</td>
</tr>

<!-- Footer -->
<tr>
<td style="background-color: #f8fafc; padding: 28px 40px; border-top: 1px solid #e2e8f0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center">
<img src="https://mhplus.online/logo.png" alt="מחציות פלוס" width="32" height="32" style="display: block; margin: 0 auto 8px; border-radius: 8px; opacity: 0.7;" />
<p style="margin: 0 0 4px; font-size: 14px; font-weight: 600; color: #4a5568; font-family: 'Heebo', Arial, sans-serif;">מחציות פלוס</p>
<p style="margin: 0 0 16px; font-size: 12px; color: #a0aec0; font-family: 'Heebo', Arial, sans-serif;">ניהול הוצאות משותפות בין הורים</p>
<p style="margin: 0; font-size: 12px; color: #a0aec0; font-family: 'Heebo', Arial, sans-serif;">
<a href="${appUrl}/account-settings" style="color: #667eea; text-decoration: none;">הגדרות התראות</a>
<span style="color: #cbd5e0; margin: 0 8px;">|</span>
<a href="${appUrl}/account-settings" style="color: #667eea; text-decoration: none;">ביטול הרשמה</a>
</p>
</td>
</tr>
</table>
</td>
</tr>

</table>
</td></tr>
</table>
</body>
</html>`;

          console.log(`📧 Sending email to ${recipientEmail}...`);
          try {
            const emailResponse = await supabase.functions.invoke('send-email', {
              body: {
                to: recipientEmail,
                subject: isTemplateEdit
                  ? `עדכון הוצאה מתחדשת: ${editSummary || description}`
                  : `הוצאה חדשה לאישור: ${amount} ₪ - ${description}`,
                html: emailHtml,
              },
            });

            if (emailResponse.error) {
              console.error('❌ Email invocation error:', emailResponse.error);
              emailResult = { success: false, error: emailResponse.error.message };
            } else if (emailResponse.data?.success === false) {
              console.error('❌ Email send failed:', emailResponse.data.error);
              emailResult = { success: false, error: emailResponse.data.error };
            } else if (emailResponse.data?.success === true) {
              console.log('✅ Email sent successfully');
              emailResult = { success: true };
            } else {
              console.warn('⚠️ Email unexpected response:', JSON.stringify(emailResponse.data));
              emailResult = { success: false, error: 'Unexpected response from send-email' };
            }
          } catch (emailError) {
            console.error('❌ Email exception:', emailError);
            emailResult = { success: false, error: 'Exception sending email' };
          }

          // Log to notification_logs regardless of outcome
          await supabase.from('notification_logs').insert({
            user_id: recipientUserId,
            account_id: account_id,
            notification_type: notificationType,
            channel: 'email',
            title: isTemplateEdit
              ? `עדכון הוצאה מתחדשת: ${editSummary || description}`
              : `הוצאה חדשה לאישור: ${amount} ₪ - ${description}`,
            body: isTemplateEdit
              ? `${creatorName} עדכן/ה הוצאה מתחדשת הדורשת את אישורך`
              : `${creatorName} הוסיף/ה הוצאה חדשה הדורשת את אישורך`,
            data: { expenseId: expense_id },
            status: emailResult.success ? 'sent' : 'failed',
            error_message: emailResult.error || null,
          });
        }
      }

      allResults.push({ recipientUserId, push: pushResult, sms: smsResult, email: emailResult });
      console.log(`📊 Results for ${recipientUserId}: push=${JSON.stringify(pushResult)}, sms=${JSON.stringify(smsResult)}, email=${JSON.stringify(emailResult)}`);
    }

    const anySuccess = allResults.some(r => r.push.success || r.sms.success || r.email.success);
    console.log(`📊 Final: ${allResults.length} recipients processed, anySuccess=${anySuccess}`);

    return new Response(
      JSON.stringify({
        success: anySuccess,
        recipients: allResults,
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
