/**
 * Fetch CPI index from CBS API and store in cpi_history.
 * Scheduled: 15th of each month at 19:00 Israel time (~16:00 UTC winter, 17:00 UTC summer).
 * CBS publishes index around 18:30.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CBS_API_URL = 'https://api.cbs.gov.il/index/data/price?id=120010&format=json&download=false'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const cronSecret = Deno.env.get('CRON_SECRET')

    const cronSecretHeader = req.headers.get('X-Cron-Secret')
    const authHeader = req.headers.get('Authorization')

    let isAuthorized = false
    if (cronSecretHeader && cronSecret && cronSecretHeader === cronSecret) {
      isAuthorized = true
    } else if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        auth: { persistSession: false },
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
        if (profile?.is_super_admin) isAuthorized = true
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    let totalInserted = 0
    let page = 1
    let hasMore = true

    while (hasMore) {
      const url = `${CBS_API_URL}&Page=${page}&PageSize=100`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`CBS API error: ${res.status}`)

      const data = await res.json()
      const months = data?.month?.[0]?.date
      if (!months || !Array.isArray(months) || months.length === 0) {
        hasMore = false
        break
      }

      for (const m of months) {
        const year = m?.year
        const month = m?.month
        const value = m?.currBase?.value
        if (year == null || month == null || value == null) continue

        const period = `${year}-${String(month).padStart(2, '0')}`
        const { error } = await supabase.from('cpi_history').upsert(
          { period, index_value: Number(value), fetched_at: new Date().toISOString() },
          { onConflict: 'period' }
        )
        if (!error) totalInserted++
      }

      const paging = data?.paging
      hasMore = paging?.current_page < paging?.last_page
      page++
    }

    return new Response(
      JSON.stringify({ success: true, inserted: totalInserted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('fetch-cpi-index error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal error', details: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
