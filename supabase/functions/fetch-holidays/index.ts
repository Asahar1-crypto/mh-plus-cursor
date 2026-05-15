// fetch-holidays edge function — rewritten for the custody v2 feature.
//
// This function now supports a single admin-only action: `import_year`.
// It pulls Israeli Jewish holidays from Hebcal for the given school year
// (Sep 1 → Aug 31) and upserts them into `school_calendar_events`.
//
// School vacations (חופש גדול, חופשת פסח, etc.) are NOT auto-populated —
// they must be curated by an admin via the `/admin/school-calendar` UI.
//
// Returns the number of events imported/updated.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type EducationLevel = 'kindergarten' | 'elementary' | 'middle_school' | 'high_school'
const ALL_LEVELS: EducationLevel[] = ['kindergarten', 'elementary', 'middle_school', 'high_school']

// Whitelist of Hebcal titles that are actual school closures.
// Keyed by a substring match on the Hebrew title (case-sensitive).
// Events NOT in this map are dropped — so ט״ו בשבט, ל״ג בעומר, ראשי חודשים,
// ימי השואה ceremonies, etc. are filtered out automatically.
interface EventMeta {
  event_key: string
  name_he: string
  parent_event_key: string | null
}

const CLOSURE_MAP: Array<{ match: (title: string) => boolean; meta: EventMeta }> = [
  {
    match: (t) => t.startsWith('ראש השנה'),
    meta: { event_key: 'rosh_hashanah', name_he: 'ראש השנה', parent_event_key: null },
  },
  {
    match: (t) => t === 'יום כיפור',
    meta: { event_key: 'yom_kippur', name_he: 'יום כיפור', parent_event_key: null },
  },
  {
    match: (t) => t.startsWith('סוכות') && !t.includes('חוה״מ') && !t.includes('חול המועד'),
    meta: { event_key: 'sukkot_day1', name_he: 'סוכות', parent_event_key: 'sukkot' },
  },
  {
    match: (t) => t.includes('חוה״מ סוכות') || t.includes('חול המועד סוכות'),
    meta: {
      event_key: 'sukkot_chol_hamoed',
      name_he: 'סוכות - חול המועד',
      parent_event_key: 'sukkot',
    },
  },
  {
    match: (t) => t === 'שמיני עצרת',
    meta: {
      event_key: 'shemini_atzeret',
      name_he: 'שמיני עצרת',
      parent_event_key: 'sukkot',
    },
  },
  {
    match: (t) => t === 'שמחת תורה',
    meta: {
      event_key: 'simchat_torah',
      name_he: 'שמחת תורה',
      parent_event_key: 'sukkot',
    },
  },
  {
    match: (t) => t === 'פורים',
    meta: { event_key: 'purim', name_he: 'פורים', parent_event_key: null },
  },
  {
    match: (t) => t.startsWith('פסח') && !t.includes('חוה״מ') && !t.includes('חול המועד') && !t.includes('שביעי'),
    meta: { event_key: 'pesach_day1', name_he: 'פסח (יום ראשון)', parent_event_key: 'pesach' },
  },
  {
    match: (t) => t.includes('חוה״מ פסח') || t.includes('חול המועד פסח'),
    meta: { event_key: 'pesach_chol_hamoed', name_he: 'פסח - חול המועד', parent_event_key: 'pesach' },
  },
  {
    match: (t) => t.includes('שביעי של פסח'),
    meta: { event_key: 'pesach_vii', name_he: 'שביעי של פסח', parent_event_key: 'pesach' },
  },
  {
    match: (t) => t === 'יום הזיכרון',
    meta: { event_key: 'yom_hazikaron', name_he: 'יום הזיכרון', parent_event_key: null },
  },
  {
    match: (t) => t === 'יום העצמאות',
    meta: { event_key: 'yom_haatzmaut', name_he: 'יום העצמאות', parent_event_key: null },
  },
  {
    match: (t) => t === 'שבועות',
    meta: { event_key: 'shavuot', name_he: 'שבועות', parent_event_key: null },
  },
]

interface HebcalItem {
  title: string
  hebrew?: string
  date: string
  category?: string
  subcat?: string
  yomtov?: boolean
}

async function fetchHebcalYear(gregorianYear: number): Promise<HebcalItem[]> {
  const url = new URL('https://www.hebcal.com/hebcal')
  url.searchParams.set('v', '1')
  url.searchParams.set('cfg', 'json')
  url.searchParams.set('maj', 'on')
  url.searchParams.set('mod', 'on')
  url.searchParams.set('i', 'on')
  url.searchParams.set('year', String(gregorianYear))
  url.searchParams.set('lg', 'h')

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Hebcal request failed: ${res.status}`)
  const data = await res.json()
  return (data.items ?? []) as HebcalItem[]
}

interface CalendarEventPayload {
  school_year: string
  event_key: string
  name_he: string
  parent_event_key: string | null
  start_date: string
  end_date: string
  kind: 'holiday' | 'vacation' | 'irregular'
  applies_to: EducationLevel[]
  stream: 'mamlachti' | 'mamlachti_dati' | 'haredi'
  source: 'hebcal' | 'mankal' | 'manual'
  source_ref: string | null
}

function mapHebcalItemsToEvents(
  items: HebcalItem[],
  schoolYear: string,
): CalendarEventPayload[] {
  // First: filter + transform each item, merging consecutive days that share
  // the same event_key (e.g. ראש השנה spans 2 days in Israel).
  type Bucket = {
    event_key: string
    name_he: string
    parent_event_key: string | null
    dates: string[]
  }
  const buckets = new Map<string, Bucket>()

  for (const item of items) {
    // Hebcal returns `date` as 'YYYY-MM-DD' for date-only events; for timed
    // events it's an ISO string. We only take the YYYY-MM-DD portion.
    const date = item.date.slice(0, 10)
    const title = (item.hebrew ?? item.title ?? '').trim()
    if (!title) continue

    const entry = CLOSURE_MAP.find((c) => c.match(title))
    if (!entry) continue

    const bucket =
      buckets.get(entry.meta.event_key) ??
      ({
        event_key: entry.meta.event_key,
        name_he: entry.meta.name_he,
        parent_event_key: entry.meta.parent_event_key,
        dates: [],
      } satisfies Bucket)
    if (!bucket.dates.includes(date)) bucket.dates.push(date)
    buckets.set(entry.meta.event_key, bucket)
  }

  // Build payloads. Each contiguous run of dates becomes one row.
  const payloads: CalendarEventPayload[] = []
  for (const bucket of buckets.values()) {
    const sorted = bucket.dates.slice().sort()
    let rangeStart = sorted[0]
    let prev = sorted[0]
    for (let i = 1; i <= sorted.length; i++) {
      const cur = sorted[i]
      const prevDate = new Date(prev + 'T00:00:00Z')
      const curDate = cur ? new Date(cur + 'T00:00:00Z') : null
      const isContiguous =
        curDate !== null &&
        Math.round((curDate.getTime() - prevDate.getTime()) / 86_400_000) === 1

      if (!isContiguous) {
        payloads.push({
          school_year: schoolYear,
          event_key: bucket.event_key,
          name_he: bucket.name_he,
          parent_event_key: bucket.parent_event_key,
          start_date: rangeStart,
          end_date: prev,
          kind: 'holiday',
          applies_to: ALL_LEVELS,
          stream: 'mamlachti',
          source: 'hebcal',
          source_ref: `hebcal:${bucket.event_key}:${schoolYear}`,
        })
        rangeStart = cur ?? rangeStart
      }
      if (cur) prev = cur
    }
  }
  return payloads
}

function schoolYearKey(startGregorianYear: number): string {
  return `${startGregorianYear}-${startGregorianYear + 1}`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const action = body.action ?? 'import_year'
    const schoolYear: string | undefined = body.school_year

    if (action !== 'import_year') {
      return new Response(
        JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!schoolYear || !/^\d{4}-\d{4}$/.test(schoolYear)) {
      return new Response(
        JSON.stringify({ success: false, error: 'school_year must be "YYYY-YYYY"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'יש להתחבר כדי לבצע פעולה זו' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabaseAuth = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'אימות נכשל. נסה להתחבר מחדש.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const service = createClient(supabaseUrl!, supabaseServiceKey!)
    const { data: isAdmin, error: adminError } = await service.rpc('is_super_admin', {
      user_uuid: user.id,
    })
    if (adminError || !isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: 'פעולה זו שמורה למנהלי-על בלבד' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const [startYearStr, endYearStr] = schoolYear.split('-')
    const startYear = Number(startYearStr)
    const endYear = Number(endYearStr)
    if (endYear !== startYear + 1) {
      return new Response(
        JSON.stringify({ success: false, error: 'school_year years must be consecutive' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    console.log(`Fetching Hebcal for ${schoolYear} (${startYear}, ${endYear})`)
    const [itemsY1, itemsY2] = await Promise.all([
      fetchHebcalYear(startYear),
      fetchHebcalYear(endYear),
    ])

    // Keep only items that fall inside the school year window (Sep 1 - Aug 31).
    const windowStart = `${startYear}-09-01`
    const windowEnd = `${endYear}-08-31`
    const relevant = [...itemsY1, ...itemsY2].filter((it) => {
      const d = it.date.slice(0, 10)
      return d >= windowStart && d <= windowEnd
    })

    const payloads = mapHebcalItemsToEvents(relevant, schoolYear)

    if (payloads.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'לא נמצאו אירועים מ-Hebcal — בדוק את הרשת או את שנת הלימודים',
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { error: upsertError } = await service
      .from('school_calendar_events')
      .upsert(payloads, { onConflict: 'school_year,event_key,start_date,stream' })

    if (upsertError) {
      console.error('Upsert error:', upsertError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'שגיאה בשמירת אירועים',
          details: upsertError.message,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Silence unused variable warning — `schoolYearKey` is exported for callers
    // that want to derive school_year from a Gregorian start year.
    void schoolYearKey

    console.log(`✅ Imported ${payloads.length} events for ${schoolYear}`)

    return new Response(
      JSON.stringify({
        success: true,
        imported: payloads.length,
        school_year: schoolYear,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('💥 Unexpected error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'שגיאה לא צפויה',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
