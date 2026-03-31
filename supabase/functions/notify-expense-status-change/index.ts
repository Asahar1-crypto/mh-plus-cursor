import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Escape HTML special characters to prevent XSS in email templates */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

type ExpenseStatus = 'approved' | 'rejected' | 'paid';

interface StatusChangeRequest {
  expense_id: string;
  account_id: string;
  new_status: ExpenseStatus;
  changed_by: string;
}

const STATUS_CONFIG: Record<ExpenseStatus, {
  notification_type: string;
  title: string;
  bodyTemplate: (changerName: string, amount: string, description: string) => string;
  emailSubjectTemplate: (amount: string, description: string) => string;
  emailHeading: string;
  emailAction: (changerName: string, amount: string, description: string) => string;
  emailButtonText: string;
  emailButtonColor: string;
  smsEnabled: boolean;
}> = {
  approved: {
    notification_type: 'expense_approved',
    title: 'ההוצאה אושרה',
    bodyTemplate: (changerName, amount, description) =>
      `${changerName} אישר/ה את ההוצאה: ${amount} \u20AA - ${description}`,
    emailSubjectTemplate: (amount, description) =>
      `ההוצאה אושרה: ${amount} \u20AA - ${description}`,
    emailHeading: 'ההוצאה שלך אושרה',
    emailAction: (changerName, amount, description) =>
      `<strong>${changerName}</strong> אישר/ה את ההוצאה שהוספת:`,
    emailButtonText: 'לצפייה בהוצאה',
    emailButtonColor: '#38a169',
    smsEnabled: false,
  },
  rejected: {
    notification_type: 'expense_rejected',
    title: 'ההוצאה נדחתה',
    bodyTemplate: (changerName, amount, description) =>
      `${changerName} דחה/תה את ההוצאה: ${amount} \u20AA - ${description}`,
    emailSubjectTemplate: (amount, description) =>
      `ההוצאה נדחתה: ${amount} \u20AA - ${description}`,
    emailHeading: 'ההוצאה שלך נדחתה',
    emailAction: (changerName, _amount, _description) =>
      `<strong>${changerName}</strong> דחה/תה את ההוצאה שהוספת:`,
    emailButtonText: 'לצפייה בהוצאה',
    emailButtonColor: '#e53e3e',
    smsEnabled: true, // SMS only for rejected (most urgent)
  },
  paid: {
    notification_type: 'expense_paid',
    title: 'ההוצאה סומנה כשולמה',
    bodyTemplate: (changerName, amount, _description) =>
      `${changerName} סימן/ה את ההוצאה כשולמה: ${amount} \u20AA`,
    emailSubjectTemplate: (amount, _description) =>
      `הוצאה סומנה כשולמה: ${amount} \u20AA`,
    emailHeading: 'הוצאה סומנה כשולמה',
    emailAction: (changerName, amount, _description) =>
      `<strong>${changerName}</strong> סימן/ה את ההוצאה כשולמה:`,
    emailButtonText: 'לצפייה בהוצאה',
    emailButtonColor: '#3182ce',
    smsEnabled: false,
  },
};

function buildEmailHtml(
  config: typeof STATUS_CONFIG[ExpenseStatus],
  recipientName: string,
  changerName: string,
  amount: string,
  description: string,
  accountName: string,
  appUrl: string,
): string {
  const safeRecipientName = escapeHtml(recipientName);
  const safeChangerName = escapeHtml(changerName);
  const safeAmount = escapeHtml(amount);
  const safeDescription = escapeHtml(description);
  const safeAccountName = escapeHtml(accountName);
  const safeHeading = escapeHtml(config.emailHeading);
  const safeButtonText = escapeHtml(config.emailButtonText);

  // Status-specific theming
  const statusThemes: Record<string, { icon: string; pillBg: string; pillColor: string; accentColor: string; borderColor: string }> = {
    '#38a169': { icon: '&#x2705;', pillBg: '#E8F5E9', pillColor: '#2E7D32', accentColor: '#38a169', borderColor: '#C8E6C9' },  // approved (green)
    '#e53e3e': { icon: '&#x274C;', pillBg: '#FFEBEE', pillColor: '#C62828', accentColor: '#e53e3e', borderColor: '#FFCDD2' },  // rejected (red)
    '#3182ce': { icon: '&#x1F4B0;', pillBg: '#E3F2FD', pillColor: '#1565C0', accentColor: '#3182ce', borderColor: '#BBDEFB' },  // paid (blue)
  };

  const theme = statusThemes[config.emailButtonColor] || statusThemes['#3182ce'];

  return `<!DOCTYPE html>
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

<!-- Colored accent border -->
<tr>
<td style="background-color: ${theme.accentColor}; height: 4px; font-size: 0; line-height: 0;">&nbsp;</td>
</tr>

<!-- Body -->
<tr>
<td style="background-color: #ffffff; padding: 40px 40px 32px;">

<!-- Status pill -->
<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 28px;">
<tr>
<td style="background-color: ${theme.pillBg}; border-radius: 50px; padding: 8px 20px;">
<span style="font-size: 15px; font-weight: 600; color: ${theme.pillColor}; font-family: 'Heebo', Arial, sans-serif;">${theme.icon} ${safeHeading}</span>
</td>
</tr>
</table>

<!-- Greeting -->
<p style="font-size: 17px; color: #2d3748; margin: 0 0 8px; font-family: 'Heebo', Arial, sans-serif;">היי ${safeRecipientName},</p>
<p style="font-size: 15px; color: #4a5568; margin: 0 0 28px; line-height: 1.6; font-family: 'Heebo', Arial, sans-serif;">${config.emailAction(safeChangerName, safeAmount, safeDescription)}</p>

<!-- Expense details card -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; border-right: 4px solid ${theme.accentColor}; overflow: hidden; margin-bottom: 32px;">
<!-- Amount row -->
<tr>
<td style="padding: 24px 28px; text-align: center; border-bottom: 1px solid #e2e8f0;">
<p style="margin: 0 0 4px; font-size: 13px; color: #718096; font-family: 'Heebo', Arial, sans-serif;">סכום</p>
<p style="margin: 0; font-size: 36px; font-weight: 800; color: ${theme.accentColor}; font-family: 'Heebo', Arial, sans-serif;">${safeAmount} &#8362;</p>
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
<a href="${appUrl}" target="_blank" style="display: inline-block; background-color: ${theme.accentColor}; color: #ffffff; font-size: 17px; font-weight: 700; text-decoration: none; padding: 16px 48px; border-radius: 50px; font-family: 'Heebo', Arial, sans-serif;">${safeButtonText} &#x2192;</a>
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

    // Verify JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('No authorization header');
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
      console.error('Authentication failed:', claimsError?.message);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', userId);

    // Service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { expense_id, account_id, new_status, changed_by }: StatusChangeRequest = await req.json();
    console.log(`Notify status change: expense_id=${expense_id}, account_id=${account_id}, new_status=${new_status}, changed_by=${changed_by}`);

    if (!expense_id || !account_id || !new_status || !changed_by) {
      return new Response(
        JSON.stringify({ error: 'expense_id, account_id, new_status, and changed_by are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['approved', 'rejected', 'paid'].includes(new_status)) {
      return new Response(
        JSON.stringify({ error: 'new_status must be approved, rejected, or paid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is a member of the requested account
    const { data: isMember, error: memberError } = await supabase.rpc(
      'is_account_member',
      { user_uuid: userId, account_uuid: account_id }
    );

    if (memberError || !isMember) {
      console.error('Access denied or membership check error');
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

    // Get expense details including child name
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

    console.log(`Expense: amount=${expense.amount}, created_by=${expense.created_by_id}`);

    // Idempotency check: skip if a notification for this expense + status was already sent
    const { data: existingNotification } = await supabase
      .from('notification_logs')
      .select('id')
      .eq('notification_type', STATUS_CONFIG[new_status].notification_type)
      .eq('status', 'sent')
      .eq('data->>expenseId', expense_id)
      .limit(1)
      .maybeSingle();

    if (existingNotification) {
      console.log(`Notification already sent for expense ${expense_id} status=${new_status}, skipping`);
      return new Response(
        JSON.stringify({ skipped: true, reason: 'already_notified' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the name of the person who changed the status
    const { data: changerProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', changed_by)
      .single();

    const changerName = changerProfile?.name || 'משתמש';
    const amount = expense.amount.toLocaleString('he-IL');
    const description = expense.description || 'הוצאה';
    const appUrl = Deno.env.get('APP_URL') || 'https://mhplus.online';
    const config = STATUS_CONFIG[new_status];

    // Determine recipients
    // For approved/rejected: notify the expense CREATOR
    // For paid: notify the expense CREATOR AND all other members (except the person who changed it)
    let recipientUserIds: string[] = [];

    if (new_status === 'paid') {
      // Notify creator + all other members except the changer
      const { data: members } = await supabase
        .from('account_members')
        .select('user_id')
        .eq('account_id', account_id)
        .neq('user_id', changed_by);

      recipientUserIds = members?.map(m => m.user_id) || [];
      // Ensure creator is included (might already be in the list)
      if (expense.created_by_id !== changed_by && !recipientUserIds.includes(expense.created_by_id)) {
        recipientUserIds.push(expense.created_by_id);
      }
    } else {
      // approved / rejected: notify only the creator (if they are not the one who changed it)
      if (expense.created_by_id !== changed_by) {
        recipientUserIds = [expense.created_by_id];
      }
    }

    if (recipientUserIds.length === 0) {
      console.log('No recipients to notify (changer is the only relevant user)');
      return new Response(
        JSON.stringify({ message: 'No recipients to notify', skipped: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Recipients: ${recipientUserIds.join(', ')}`);

    // Process each recipient
    const allResults: Array<{
      userId: string;
      push: { success: boolean; reason?: string };
      sms: { success: boolean; reason?: string; error?: string };
      email: { success: boolean; reason?: string; error?: string };
    }> = [];

    for (const recipientUserId of recipientUserIds) {
      console.log(`--- Processing recipient: ${recipientUserId} ---`);

      // Get recipient's profile
      const { data: recipientProfile } = await supabase
        .from('profiles')
        .select('name, phone_e164, phone_number')
        .eq('id', recipientUserId)
        .single();

      const recipientName = recipientProfile?.name || 'משתמש';

      // Get recipient's notification preferences
      const { data: recipientPrefs } = await supabase
        .from('notification_preferences')
        .select('sms_enabled, email_enabled, preferences')
        .eq('user_id', recipientUserId)
        .eq('account_id', account_id)
        .maybeSingle();

      const perTypePrefs = (recipientPrefs?.preferences as Record<string, { push: boolean; sms: boolean; email: boolean }> | null)?.[config.notification_type];

      // ============================================================
      // 1. PUSH NOTIFICATION
      // ============================================================
      let pushResult: { success: boolean; reason?: string; fallback?: string } = { success: false, reason: 'not_attempted' };
      try {
        const pushPayload = {
          userId: recipientUserId,
          accountId: account_id,
          type: config.notification_type,
          title: config.title,
          body: config.bodyTemplate(changerName, amount, description),
          data: { expenseId: expense_id },
          actionUrl: appUrl,
        };

        console.log(`Sending push to ${recipientUserId}...`);
        const pushResponse = await supabase.functions.invoke('send-push-notification', {
          body: pushPayload,
        });

        if (pushResponse.error) {
          console.error('Push error:', pushResponse.error);
          pushResult = { success: false, reason: pushResponse.error.message };
        } else {
          pushResult = pushResponse.data || { success: true };
          console.log('Push result:', JSON.stringify(pushResult));
        }
      } catch (pushError) {
        console.error('Push exception:', pushError);
        pushResult = { success: false, reason: 'exception' };
      }

      // ============================================================
      // 2. SMS NOTIFICATION (only for rejected status)
      // ============================================================
      let smsResult: { success: boolean; reason?: string; error?: string; messageId?: string } = { success: false, reason: 'not_attempted' };

      if (config.smsEnabled) {
        const shouldSendSMS = recipientPrefs?.sms_enabled ?? true;
        const perTypeSmsEnabled = perTypePrefs?.sms ?? true;

        // SMS fallback logic: send when push didn't reach the user
        const noActiveTokens = pushResult?.fallback === 'sms';
        const pushGloballyDisabled = pushResult?.success === false && pushResult?.reason === 'Push notifications disabled';
        const pushException = pushResult?.success === false && pushResult?.reason === 'exception';
        const shouldAttemptSms = (noActiveTokens || pushGloballyDisabled || pushException) && shouldSendSMS && perTypeSmsEnabled;

        if (!shouldAttemptSms) {
          const skipReason = !shouldSendSMS ? 'sms_disabled_by_user' : !perTypeSmsEnabled ? 'sms_disabled_for_type' : 'push_delivered';
          console.log(`SMS skipped (${skipReason})`);
          smsResult = { success: false, reason: skipReason };
        } else {
          const recipientPhone = recipientProfile?.phone_e164 || recipientProfile?.phone_number;

          if (!recipientPhone) {
            console.log('No phone number for recipient');
            smsResult = { success: false, error: 'No phone number' };
          } else if (!vonageApiKey || !vonageApiSecret || !vonageFromNumber) {
            console.error('Vonage not configured');
            smsResult = { success: false, error: 'SMS service not configured' };
          } else {
            const smsMessage = `היי ${recipientName},\n${config.bodyTemplate(changerName, amount, description)}\n${appUrl}`;
            const cleanPhone = recipientPhone.replace(/^\+/, '');

            console.log(`Sending SMS to ${cleanPhone}...`);
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
              console.log('Vonage response:', JSON.stringify(vonageResult));

              if (!vonageResult?.messages || !Array.isArray(vonageResult.messages) || vonageResult.messages.length === 0) {
                console.error('Unexpected Vonage response structure:', JSON.stringify(vonageResult));
                smsResult = { success: false, error: 'Unexpected response from SMS provider' };
              } else if (vonageResult.messages[0]?.status === '0') {
                console.log('SMS sent successfully');
                smsResult = { success: true, messageId: vonageResult.messages[0]['message-id'] };
              } else {
                const errorText = vonageResult.messages?.[0]?.['error-text'] || 'Unknown error';
                console.error('SMS error:', errorText);
                smsResult = { success: false, error: errorText };
              }
            } catch (smsError) {
              console.error('SMS exception:', smsError);
              smsResult = { success: false, error: 'Exception sending SMS' };
            }
          }
        }

        // Log SMS attempt
        await supabase.from('notification_logs').insert({
          user_id: recipientUserId,
          account_id: account_id,
          notification_type: config.notification_type,
          channel: 'sms',
          title: config.title,
          body: config.bodyTemplate(changerName, amount, description),
          data: { expenseId: expense_id },
          status: smsResult.success ? 'sent' : 'failed',
          error_message: smsResult.error || smsResult.reason || null,
        });
      }

      // ============================================================
      // 3. EMAIL NOTIFICATION
      // ============================================================
      const emailMasterEnabled = recipientPrefs?.email_enabled ?? true;
      const perTypeEmailEnabled = perTypePrefs?.email ?? true;
      const shouldSendEmail = emailMasterEnabled && perTypeEmailEnabled;

      let emailResult: { success: boolean; error?: string; reason?: string } = { success: false, reason: 'not_attempted' };

      if (!shouldSendEmail) {
        console.log('Email skipped (disabled by user)');
        emailResult = { success: false, reason: 'email_disabled_by_user' };
      } else {
        // Get recipient email address from auth
        const { data: authUserData, error: authUserError } = await supabase.auth.admin.getUserById(recipientUserId);
        const recipientEmail = authUserData?.user?.email;

        if (authUserError || !recipientEmail) {
          console.log('No email address for recipient');
          emailResult = { success: false, reason: 'no_email_address' };
        } else {
          const emailHtml = buildEmailHtml(
            config,
            recipientName,
            changerName,
            amount,
            description,
            account.name,
            appUrl,
          );

          console.log(`Sending email to ${recipientEmail}...`);
          try {
            const emailResponse = await supabase.functions.invoke('send-email', {
              body: {
                to: recipientEmail,
                subject: config.emailSubjectTemplate(amount, description),
                html: emailHtml,
              },
            });

            if (emailResponse.error) {
              console.error('Email error:', emailResponse.error);
              emailResult = { success: false, error: emailResponse.error.message };
            } else if (emailResponse.data?.warning) {
              console.warn('Email warning (SendGrid):', emailResponse.data.warning);
              emailResult = { success: false, error: emailResponse.data.warning };
            } else {
              console.log('Email sent successfully');
              emailResult = { success: true };
            }
          } catch (emailError) {
            console.error('Email exception:', emailError);
            emailResult = { success: false, error: 'Exception sending email' };
          }
        }

        // Log email attempt
        await supabase.from('notification_logs').insert({
          user_id: recipientUserId,
          account_id: account_id,
          notification_type: config.notification_type,
          channel: 'email',
          title: config.emailSubjectTemplate(amount, description),
          body: config.bodyTemplate(changerName, amount, description),
          data: { expenseId: expense_id },
          status: emailResult.success ? 'sent' : 'failed',
          error_message: emailResult.error || emailResult.reason || null,
        });
      }

      allResults.push({
        userId: recipientUserId,
        push: pushResult,
        sms: smsResult,
        email: emailResult,
      });

      console.log(`Recipient ${recipientUserId}: push=${JSON.stringify(pushResult)}, sms=${JSON.stringify(smsResult)}, email=${JSON.stringify(emailResult)}`);
    }

    const anySuccess = allResults.some(r => r.push.success || r.sms.success || r.email.success);

    return new Response(
      JSON.stringify({
        success: anySuccess,
        recipients: allResults,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Notify expense status change error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
