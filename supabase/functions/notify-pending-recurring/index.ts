import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** Escape user-provided strings before embedding in HTML */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface PendingExpense {
  id: string
  amount: number
  description: string
  date: string
  paid_by_id: string
  created_by_id: string
  account_id: string
}

function buildBatchedEmailHtml(
  recipientName: string,
  accountName: string,
  expenses: PendingExpense[],
  formattedTotal: string,
  appUrl: string,
): string {
  const safeRecipientName = escapeHtml(recipientName)
  const safeAccountName = escapeHtml(accountName)
  const count = expenses.length

  const expenseRowsHtml = expenses.map(e => {
    const safeDesc = escapeHtml(e.description || 'הוצאה')
    const safeAmt = escapeHtml(e.amount.toLocaleString('he-IL'))
    return `
<tr>
<td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; font-size: 15px; color: #2d3748; font-family: 'Heebo', Arial, sans-serif;">${safeDesc}</td>
<td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; font-size: 15px; font-weight: 700; color: #0EA5E9; text-align: left; font-family: 'Heebo', Arial, sans-serif; white-space: nowrap;">${safeAmt} &#8362;</td>
</tr>`
  }).join('')

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

<!-- Body -->
<tr>
<td style="background-color: #ffffff; padding: 40px 40px 32px;">

<!-- Status pill -->
<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 28px;">
<tr>
<td style="background-color: #FFF3E0; border-radius: 50px; padding: 8px 20px;">
<span style="font-size: 15px; font-weight: 600; color: #E65100; font-family: 'Heebo', Arial, sans-serif;">&#x1F514; הוצאות חוזרות ממתינות לאישור</span>
</td>
</tr>
</table>

<!-- Greeting -->
<p style="font-size: 17px; color: #2d3748; margin: 0 0 8px; font-family: 'Heebo', Arial, sans-serif;">היי ${safeRecipientName},</p>
<p style="font-size: 15px; color: #4a5568; margin: 0 0 28px; line-height: 1.6; font-family: 'Heebo', Arial, sans-serif;">
${count === 1
  ? `נוצרה הוצאה חוזרת חדשה הממתינה לאישורך בחשבון <strong>${safeAccountName}</strong>:`
  : `נוצרו <strong>${count}</strong> הוצאות חוזרות חדשות הממתינות לאישורך בחשבון <strong>${safeAccountName}</strong>:`}
</p>

<!-- Expenses table -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; margin-bottom: 16px;">
<tr>
<td style="padding: 12px 20px; background-color: #edf2f7; font-size: 13px; font-weight: 600; color: #718096; font-family: 'Heebo', Arial, sans-serif;">תיאור</td>
<td style="padding: 12px 20px; background-color: #edf2f7; font-size: 13px; font-weight: 600; color: #718096; text-align: left; font-family: 'Heebo', Arial, sans-serif;">סכום</td>
</tr>
${expenseRowsHtml}
</table>

<!-- Total -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
<tr>
<td style="padding: 8px 20px; text-align: left;">
<span style="font-size: 17px; font-weight: 800; color: #2d3748; font-family: 'Heebo', Arial, sans-serif;">סה"כ: ${escapeHtml(formattedTotal)} &#8362;</span>
</td>
</tr>
</table>

<!-- CTA Button -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="padding-bottom: 8px;">
<a href="${appUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; font-size: 17px; font-weight: 700; text-decoration: none; padding: 16px 48px; border-radius: 50px; font-family: 'Heebo', Arial, sans-serif;">&#x2192; לאישור ההוצאות</a>
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
</html>`
}

/**
 * notify-pending-recurring
 *
 * Called internally by generate-recurring-expenses after new recurring
 * expense instances are created. Sends ONE batched notification per
 * account to all members who need to approve pending expenses.
 *
 * Auth: service-role only (called from another edge function, not from
 * the client).
 *
 * Body: { month: number, year: number }
 *   The function queries for pending recurring expenses generated in
 *   that month/year window.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const appUrl = Deno.env.get('APP_URL') || 'https://mhplus.online'

    // ── Authentication: service-role only ───────────────────────────
    // This function is called internally by generate-recurring-expenses
    // via supabase.functions.invoke (which passes the service role key).
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // ── Parse request body ──────────────────────────────────────────
    const { month, year } = await req.json()
    if (!month || !year) {
      return new Response(
        JSON.stringify({ error: 'month and year are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔔 notify-pending-recurring: looking for pending expenses in ${month}/${year}`)

    // ── Query pending recurring expenses generated for this period ──
    // These are instances (is_recurring=false, recurring_parent_id IS NOT NULL)
    // with status='pending', in the target month.
    const cycleStart = `${year}-${String(month).padStart(2, '0')}-01`
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    const cycleEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

    const { data: pendingExpenses, error: queryError } = await supabase
      .from('expenses')
      .select('id, amount, description, date, paid_by_id, created_by_id, account_id')
      .eq('status', 'pending')
      .eq('is_recurring', false)
      .not('recurring_parent_id', 'is', null)
      .gte('date', cycleStart)
      .lt('date', cycleEnd)

    if (queryError) {
      console.error('❌ Error querying pending expenses:', queryError)
      throw queryError
    }

    if (!pendingExpenses || pendingExpenses.length === 0) {
      console.log('✅ No pending recurring expenses to notify about')
      return new Response(
        JSON.stringify({ success: true, message: 'No pending expenses', notified: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📋 Found ${pendingExpenses.length} pending recurring expenses`)

    // ── Group by account_id ─────────────────────────────────────────
    const accountMap = new Map<string, PendingExpense[]>()
    for (const expense of pendingExpenses) {
      const list = accountMap.get(expense.account_id) || []
      list.push(expense)
      accountMap.set(expense.account_id, list)
    }

    // ── Get account names ───────────────────────────────────────────
    const accountIds = Array.from(accountMap.keys())
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, name')
      .in('id', accountIds)

    const accountNameMap = new Map<string, string>()
    for (const acc of accounts || []) {
      accountNameMap.set(acc.id, acc.name)
    }

    // ── Process each account ────────────────────────────────────────
    const results: Array<{
      account_id: string
      pending_count: number
      recipients_notified: number
      push_sent: number
      email_sent: number
    }> = []

    for (const [accountId, expenses] of accountMap.entries()) {
      const accountName = accountNameMap.get(accountId) || 'חשבון'
      const count = expenses.length
      const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)
      const formattedTotal = totalAmount.toLocaleString('he-IL')

      console.log(`📤 Account "${accountName}" (${accountId}): ${count} pending expenses, total ${formattedTotal} ILS`)

      // Find all unique creators (the people who "own" the recurring templates)
      const creatorIds = new Set(expenses.map(e => e.created_by_id))

      // Get all account members EXCEPT the creators (creators don't need to
      // approve their own recurring expenses)
      const { data: members } = await supabase
        .from('account_members')
        .select('user_id')
        .eq('account_id', accountId)

      const recipientUserIds = (members || [])
        .map(m => m.user_id)
        .filter(uid => !creatorIds.has(uid))

      if (recipientUserIds.length === 0) {
        console.log(`⚠️ No recipients to notify for account ${accountId}`)
        results.push({
          account_id: accountId,
          pending_count: count,
          recipients_notified: 0,
          push_sent: 0,
          email_sent: 0,
        })
        continue
      }

      let pushSent = 0
      let emailSent = 0

      for (const recipientUserId of recipientUserIds) {
        console.log(`  📤 Notifying ${recipientUserId}`)

        // Get recipient's notification preferences
        const { data: recipientPrefs } = await supabase
          .from('notification_preferences')
          .select('email_enabled, preferences')
          .eq('user_id', recipientUserId)
          .eq('account_id', accountId)
          .maybeSingle()

        const perTypePrefs = (recipientPrefs?.preferences as Record<string, { push: boolean; email: boolean }> | null)?.['recurring_expense_created']

        // ── PUSH NOTIFICATION ──────────────────────────────────────
        let pushSuccess = false
        const pushBody = count === 1
          ? `יש הוצאה חוזרת חדשה הממתינה לאישור: ${expenses[0].description} - ${expenses[0].amount.toLocaleString('he-IL')} \u20AA`
          : `יש ${count} הוצאות חוזרות חדשות הממתינות לאישור בסך ${formattedTotal} \u20AA`

        try {
          const pushPayload = {
            userId: recipientUserId,
            accountId: accountId,
            type: 'recurring_expense_created',
            title: 'הוצאות חוזרות חדשות',
            body: pushBody,
            data: { accountId },
            actionUrl: appUrl,
          }

          const pushResponse = await supabase.functions.invoke('send-push-notification', {
            body: pushPayload,
          })

          if (!pushResponse.error && pushResponse.data?.success) {
            pushSent++
            pushSuccess = true
            console.log(`  📲 Push sent to ${recipientUserId}`)
          } else {
            console.log(`  📲 Push failed for ${recipientUserId}:`, pushResponse.error?.message || pushResponse.data?.reason)
          }
        } catch (pushError) {
          console.error(`  ❌ Push exception for ${recipientUserId}:`, pushError)
        }

        // Log push notification
        await supabase.from('notification_logs').insert({
          user_id: recipientUserId,
          account_id: accountId,
          notification_type: 'recurring_expense_created',
          channel: 'push',
          title: 'הוצאות חוזרות חדשות',
          body: pushBody,
          data: { expenseIds: expenses.map(e => e.id), accountId },
          status: pushSuccess ? 'sent' : 'failed',
        }).catch(err => console.error('  Push log insert error:', err))

        // ── EMAIL NOTIFICATION ─────────────────────────────────────
        const emailMasterEnabled = recipientPrefs?.email_enabled ?? true
        const perTypeEmailEnabled = perTypePrefs?.email ?? true
        const shouldSendEmail = emailMasterEnabled && perTypeEmailEnabled
        let emailSuccess = false

        if (!shouldSendEmail) {
          console.log(`  📧 Email skipped for ${recipientUserId} (disabled)`)
        } else {
          // Get recipient info for email
          const { data: recipientProfile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', recipientUserId)
            .single()

          const { data: authUserData } = await supabase.auth.admin.getUserById(recipientUserId)
          const recipientEmail = authUserData?.user?.email

          if (!recipientEmail) {
            console.log(`  📧 No email for ${recipientUserId}`)
          } else {
            const recipientName = recipientProfile?.name || 'משתמש'

            const emailHtml = buildBatchedEmailHtml(
              recipientName,
              accountName,
              expenses,
              formattedTotal,
              appUrl,
            )

            try {
              const emailResponse = await supabase.functions.invoke('send-email', {
                body: {
                  to: recipientEmail,
                  subject: count === 1
                    ? `הוצאה חוזרת חדשה לאישור: ${expenses[0].description}`
                    : `${count} הוצאות חוזרות חדשות לאישור - ${accountName}`,
                  html: emailHtml,
                },
              })

              if (!emailResponse.error && emailResponse.data?.success !== false) {
                emailSent++
                emailSuccess = true
                console.log(`  📧 Email sent to ${recipientEmail}`)
              } else {
                console.error(`  ❌ Email failed for ${recipientEmail}:`, emailResponse.error?.message || emailResponse.data?.error)
              }
            } catch (emailError) {
              console.error(`  ❌ Email exception for ${recipientEmail}:`, emailError)
            }
          }

          // Log email notification
          await supabase.from('notification_logs').insert({
            user_id: recipientUserId,
            account_id: accountId,
            notification_type: 'recurring_expense_created',
            channel: 'email',
            title: count === 1
              ? 'הוצאה חוזרת חדשה לאישור'
              : `${count} הוצאות חוזרות חדשות לאישור`,
            body: count === 1
              ? 'נוצרה הוצאה חוזרת חדשה הממתינה לאישורך'
              : `נוצרו ${count} הוצאות חוזרות חדשות הממתינות לאישורך`,
            data: { expenseIds: expenses.map(e => e.id), accountId },
            status: emailSuccess ? 'sent' : 'failed',
          }).catch(err => console.error('  Email log insert error:', err))
        }
      }

      results.push({
        account_id: accountId,
        pending_count: count,
        recipients_notified: recipientUserIds.length,
        push_sent: pushSent,
        email_sent: emailSent,
      })
    }

    const totalNotified = results.reduce((sum, r) => sum + r.recipients_notified, 0)
    console.log(`🔔 Done: notified ${totalNotified} recipients across ${results.length} accounts`)

    return new Response(
      JSON.stringify({ success: true, accounts: results, total_notified: totalNotified }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 notify-pending-recurring error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
