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
    const vonageApiKey = Deno.env.get('VONAGE_API_KEY');
    const vonageApiSecret = Deno.env.get('VONAGE_API_SECRET');
    const vonageFromNumber = Deno.env.get('VONAGE_FROM_NUMBER');

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { expense_id, account_id } = await req.json();
    console.log(`Notify expense approval request: expense_id=${expense_id}, account_id=${account_id}`);

    if (!expense_id || !account_id) {
      return new Response(
        JSON.stringify({ error: 'expense_id and account_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if SMS notifications are enabled for this account
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('sms_notifications_enabled, name')
      .eq('id', account_id)
      .single();

    if (accountError || !account) {
      console.log('Account not found or error:', accountError);
      return new Response(
        JSON.stringify({ error: 'Account not found', skipped: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!account.sms_notifications_enabled) {
      console.log('SMS notifications disabled for account:', account_id);
      return new Response(
        JSON.stringify({ message: 'SMS notifications disabled for this account', skipped: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if notification already sent for this expense
    const { data: existingNotification } = await supabase
      .from('expense_notifications')
      .select('id')
      .eq('expense_id', expense_id)
      .eq('notification_type', 'sms')
      .single();

    if (existingNotification) {
      console.log('Notification already sent for expense:', expense_id);
      return new Response(
        JSON.stringify({ message: 'Notification already sent', skipped: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get expense details
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select('id, amount, description, paid_by_id, status')
      .eq('id', expense_id)
      .single();

    if (expenseError || !expense) {
      console.error('Expense not found:', expenseError);
      return new Response(
        JSON.stringify({ error: 'Expense not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only send notification for pending expenses
    if (expense.status !== 'pending') {
      console.log('Expense is not pending, skipping notification');
      return new Response(
        JSON.stringify({ message: 'Expense is not pending', skipped: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all account members except the one who paid
    const { data: members, error: membersError } = await supabase
      .from('account_members')
      .select('user_id')
      .eq('account_id', account_id)
      .neq('user_id', expense.paid_by_id);

    if (membersError || !members || members.length === 0) {
      console.log('No other members found in account');
      return new Response(
        JSON.stringify({ message: 'No other members to notify', skipped: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the other member's profile (phone and name)
    const otherMemberId = members[0].user_id;
    const { data: recipientProfile, error: profileError } = await supabase
      .from('profiles')
      .select('name, phone_e164, phone_number')
      .eq('id', otherMemberId)
      .single();

    if (profileError || !recipientProfile) {
      console.error('Recipient profile not found:', profileError);
      return new Response(
        JSON.stringify({ error: 'Recipient profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const recipientPhone = recipientProfile.phone_e164 || recipientProfile.phone_number;
    if (!recipientPhone) {
      console.log('Recipient has no phone number');
      // Log the failed notification
      await supabase.from('expense_notifications').insert({
        expense_id,
        notification_type: 'sms',
        recipient_user_id: otherMemberId,
        status: 'failed',
        error_message: 'No phone number'
      });
      return new Response(
        JSON.stringify({ message: 'Recipient has no phone number', skipped: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check Vonage credentials
    if (!vonageApiKey || !vonageApiSecret || !vonageFromNumber) {
      console.error('Vonage credentials not configured');
      await supabase.from('expense_notifications').insert({
        expense_id,
        notification_type: 'sms',
        recipient_user_id: otherMemberId,
        recipient_phone: recipientPhone,
        status: 'failed',
        error_message: 'SMS service not configured'
      });
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the SMS message
    const appUrl = 'https://hchmfsilgfrzhenafbzi.lovableproject.com';
    const dashboardLink = `${appUrl}/dashboard`;
    const recipientName = recipientProfile.name || 'משתמש';
    const amount = expense.amount.toLocaleString('he-IL');
    const description = expense.description || 'הוצאה';

    const smsMessage = `היי ${recipientName},
הוצאה חדשה לאישור: ${amount} ₪
${description}
לאישור: ${dashboardLink}`;

    console.log(`Sending SMS to ${recipientPhone}: ${smsMessage}`);

    // Remove '+' from phone number for Vonage
    const cleanPhoneNumber = recipientPhone.replace(/^\+/, '');

    // Send SMS using Vonage
    const vonageResponse = await fetch('https://rest.nexmo.com/sms/json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: vonageApiKey,
        api_secret: vonageApiSecret,
        from: vonageFromNumber,
        to: cleanPhoneNumber,
        text: smsMessage,
        type: 'unicode'
      }),
    });

    const vonageResult = await vonageResponse.json();
    console.log('Vonage response:', JSON.stringify(vonageResult));

    if (vonageResult.messages && vonageResult.messages[0]?.status === '0') {
      // Success - log the notification
      await supabase.from('expense_notifications').insert({
        expense_id,
        notification_type: 'sms',
        recipient_user_id: otherMemberId,
        recipient_phone: recipientPhone,
        status: 'sent'
      });

      console.log('SMS sent successfully');
      return new Response(
        JSON.stringify({ 
          success: true, 
          messageId: vonageResult.messages[0]['message-id']
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Failed - log the error
      const errorText = vonageResult.messages?.[0]?.['error-text'] || 'Unknown error';
      await supabase.from('expense_notifications').insert({
        expense_id,
        notification_type: 'sms',
        recipient_user_id: otherMemberId,
        recipient_phone: recipientPhone,
        status: 'failed',
        error_message: errorText
      });

      console.error('Vonage error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to send SMS', details: errorText }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Notify expense approval error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
