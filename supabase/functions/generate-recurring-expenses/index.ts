import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
    const supabaseKey    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const cronSecret     = Deno.env.get('CRON_SECRET')

    // ── Authentication ───────────────────────────────────────────
    // Accepts either:
    //   • X-Cron-Secret header (for scheduled jobs)
    //   • Authorization: Bearer <super-admin-jwt> (for admin UI)
    const authHeader      = req.headers.get('Authorization')
    const cronSecretHeader = req.headers.get('X-Cron-Secret')

    let isAuthorized = false
    let authMethod   = ''

    if (cronSecretHeader && cronSecret && cronSecretHeader === cronSecret) {
      isAuthorized = true
      authMethod   = 'cron-secret'
      console.log('✅ Authenticated via cron secret')

    } else if (authHeader?.startsWith('Bearer ')) {
      const token     = authHeader.replace('Bearer ', '')
      const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false }
      })

      const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token)
      const userId = claimsData?.claims?.sub

      if (!claimsError && userId) {
        const adminClient = createClient(supabaseUrl, supabaseKey)
        const { data: profile } = await adminClient
          .from('profiles')
          .select('is_super_admin')
          .eq('id', userId)
          .single()

        if (profile?.is_super_admin) {
          isAuthorized = true
          authMethod   = 'super-admin'
          console.log('✅ Authenticated as super-admin:', userId)
        }
      }
    }

    if (!isAuthorized) {
      console.error('❌ Access denied: Requires cron secret or super-admin JWT')
      return new Response(
        JSON.stringify({ error: 'Access denied: Requires cron secret or super-admin rights' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // ── Parse optional month/year override from request body ─────
    const body = await req.json().catch(() => ({}))
    const targetMonth: number | null = body.month ?? null
    const targetYear:  number | null = body.year  ?? null

    const supabase = createClient(supabaseUrl, supabaseKey)

    const now = new Date()
    const currentMonth = targetMonth ?? (now.getMonth() + 1)
    const currentYear  = targetYear  ?? now.getFullYear()

    console.log(`🔄 Generating recurring expenses for ${currentMonth}/${currentYear} (auth: ${authMethod})`)

    // ── Delegate to the PostgreSQL function (single source of truth) ─
    const { data, error } = await supabase.rpc('generate_recurring_expenses', {
      p_month: currentMonth,
      p_year:  currentYear,
    })

    if (error) {
      console.error('❌ generate_recurring_expenses RPC error:', error)
      throw error
    }

    // data is an array with one row: [{ generated, skipped, errors }]
    const result = Array.isArray(data) ? data[0] : data
    const generatedCount = result?.generated ?? 0

    const summary = {
      success:   true,
      message:   `Generated ${generatedCount} recurring expenses for ${currentMonth}/${currentYear}`,
      generated: generatedCount,
      skipped:   result?.skipped   ?? 0,
      errors:    result?.errors    ?? 0,
      period:    { month: currentMonth, year: currentYear },
      notifications: null as { total_notified: number; accounts: unknown[] } | null,
    }

    console.log(`🎉 Generation done:`, { generated: summary.generated, skipped: summary.skipped, errors: summary.errors })

    // ── Notify about pending recurring expenses ────────────────────
    // Only attempt if at least one expense was generated.
    if (generatedCount > 0) {
      try {
        console.log(`🔔 Triggering notifications for pending recurring expenses...`)
        const notifyResponse = await supabase.functions.invoke('notify-pending-recurring', {
          body: { month: currentMonth, year: currentYear },
        })

        if (notifyResponse.error) {
          console.error('⚠️ notify-pending-recurring error:', notifyResponse.error)
        } else {
          summary.notifications = notifyResponse.data
          console.log(`🔔 Notification result:`, JSON.stringify(notifyResponse.data))
        }
      } catch (notifyError) {
        // Notification failure should NOT fail the entire generation
        console.error('⚠️ notify-pending-recurring exception (non-fatal):', notifyError)
      }
    }

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('💥 Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
