import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HolidayItem {
  name: string
  start_date: string
  end_date: string
  type: 'holiday' | 'vacation'
  parent_name: string | null
}

// Hardcoded Jewish holidays by school year (Hebrew calendar is fixed)
const holidaysByYear: Record<string, HolidayItem[]> = {
  '2024-2025': [
    { name: 'ראש השנה', start_date: '2024-10-03', end_date: '2024-10-04', type: 'holiday', parent_name: null },
    { name: 'יום כיפור', start_date: '2024-10-12', end_date: '2024-10-12', type: 'holiday', parent_name: null },
    { name: 'סוכות - ימי חג', start_date: '2024-10-17', end_date: '2024-10-17', type: 'holiday', parent_name: 'סוכות' },
    { name: 'סוכות - חול המועד', start_date: '2024-10-18', end_date: '2024-10-23', type: 'holiday', parent_name: 'סוכות' },
    { name: 'שמיני עצרת / שמחת תורה', start_date: '2024-10-24', end_date: '2024-10-24', type: 'holiday', parent_name: 'סוכות' },
    { name: 'חנוכה', start_date: '2024-12-26', end_date: '2025-01-02', type: 'holiday', parent_name: 'חנוכה' },
    { name: 'ט״ו בשבט', start_date: '2025-02-13', end_date: '2025-02-13', type: 'holiday', parent_name: null },
    { name: 'פורים', start_date: '2025-03-14', end_date: '2025-03-14', type: 'holiday', parent_name: 'פורים' },
    { name: 'פסח - ימי חג ראשונים', start_date: '2025-04-13', end_date: '2025-04-13', type: 'holiday', parent_name: 'פסח' },
    { name: 'פסח - חול המועד', start_date: '2025-04-14', end_date: '2025-04-18', type: 'holiday', parent_name: 'פסח' },
    { name: 'פסח - שביעי של פסח', start_date: '2025-04-19', end_date: '2025-04-19', type: 'holiday', parent_name: 'פסח' },
    { name: 'יום הזיכרון', start_date: '2025-04-30', end_date: '2025-04-30', type: 'holiday', parent_name: null },
    { name: 'יום העצמאות', start_date: '2025-05-01', end_date: '2025-05-01', type: 'holiday', parent_name: null },
    { name: 'ל״ג בעומר', start_date: '2025-05-16', end_date: '2025-05-16', type: 'holiday', parent_name: null },
    { name: 'יום ירושלים', start_date: '2025-05-26', end_date: '2025-05-26', type: 'holiday', parent_name: null },
    { name: 'שבועות', start_date: '2025-06-02', end_date: '2025-06-02', type: 'holiday', parent_name: null },
    { name: 'תשעה באב', start_date: '2025-08-03', end_date: '2025-08-03', type: 'holiday', parent_name: null },
  ],
  '2025-2026': [
    { name: 'ראש השנה', start_date: '2025-09-23', end_date: '2025-09-24', type: 'holiday', parent_name: null },
    { name: 'יום כיפור', start_date: '2025-10-02', end_date: '2025-10-02', type: 'holiday', parent_name: null },
    { name: 'סוכות - ימי חג', start_date: '2025-10-07', end_date: '2025-10-08', type: 'holiday', parent_name: 'סוכות' },
    { name: 'סוכות - חול המועד', start_date: '2025-10-09', end_date: '2025-10-13', type: 'holiday', parent_name: 'סוכות' },
    { name: 'שמיני עצרת / שמחת תורה', start_date: '2025-10-14', end_date: '2025-10-14', type: 'holiday', parent_name: 'סוכות' },
    { name: 'חנוכה', start_date: '2025-12-15', end_date: '2025-12-22', type: 'holiday', parent_name: 'חנוכה' },
    { name: 'ט״ו בשבט', start_date: '2026-02-02', end_date: '2026-02-02', type: 'holiday', parent_name: null },
    { name: 'פורים', start_date: '2026-03-03', end_date: '2026-03-03', type: 'holiday', parent_name: 'פורים' },
    { name: 'פסח - ימי חג ראשונים', start_date: '2026-04-02', end_date: '2026-04-02', type: 'holiday', parent_name: 'פסח' },
    { name: 'פסח - חול המועד', start_date: '2026-04-03', end_date: '2026-04-07', type: 'holiday', parent_name: 'פסח' },
    { name: 'פסח - שביעי של פסח', start_date: '2026-04-08', end_date: '2026-04-08', type: 'holiday', parent_name: 'פסח' },
    { name: 'יום הזיכרון', start_date: '2026-04-21', end_date: '2026-04-21', type: 'holiday', parent_name: null },
    { name: 'יום העצמאות', start_date: '2026-04-22', end_date: '2026-04-22', type: 'holiday', parent_name: null },
    { name: 'ל״ג בעומר', start_date: '2026-05-05', end_date: '2026-05-05', type: 'holiday', parent_name: null },
    { name: 'יום ירושלים', start_date: '2026-05-15', end_date: '2026-05-15', type: 'holiday', parent_name: null },
    { name: 'שבועות', start_date: '2026-05-22', end_date: '2026-05-22', type: 'holiday', parent_name: null },
    { name: 'תשעה באב', start_date: '2026-07-23', end_date: '2026-07-23', type: 'holiday', parent_name: null },
  ],
  '2026-2027': [
    { name: 'ראש השנה', start_date: '2026-09-12', end_date: '2026-09-13', type: 'holiday', parent_name: null },
    { name: 'יום כיפור', start_date: '2026-09-21', end_date: '2026-09-21', type: 'holiday', parent_name: null },
    { name: 'סוכות - ימי חג', start_date: '2026-09-26', end_date: '2026-09-26', type: 'holiday', parent_name: 'סוכות' },
    { name: 'סוכות - חול המועד', start_date: '2026-09-27', end_date: '2026-10-02', type: 'holiday', parent_name: 'סוכות' },
    { name: 'שמיני עצרת / שמחת תורה', start_date: '2026-10-03', end_date: '2026-10-03', type: 'holiday', parent_name: 'סוכות' },
    { name: 'חנוכה', start_date: '2026-12-05', end_date: '2026-12-12', type: 'holiday', parent_name: 'חנוכה' },
    { name: 'ט״ו בשבט', start_date: '2027-01-23', end_date: '2027-01-23', type: 'holiday', parent_name: null },
    { name: 'פורים', start_date: '2027-03-23', end_date: '2027-03-23', type: 'holiday', parent_name: 'פורים' },
    { name: 'פסח - ימי חג ראשונים', start_date: '2027-04-22', end_date: '2027-04-22', type: 'holiday', parent_name: 'פסח' },
    { name: 'פסח - חול המועד', start_date: '2027-04-23', end_date: '2027-04-27', type: 'holiday', parent_name: 'פסח' },
    { name: 'פסח - שביעי של פסח', start_date: '2027-04-28', end_date: '2027-04-28', type: 'holiday', parent_name: 'פסח' },
    { name: 'יום הזיכרון', start_date: '2027-05-11', end_date: '2027-05-11', type: 'holiday', parent_name: null },
    { name: 'יום העצמאות', start_date: '2027-05-12', end_date: '2027-05-12', type: 'holiday', parent_name: null },
    { name: 'ל״ג בעומר', start_date: '2027-05-25', end_date: '2027-05-25', type: 'holiday', parent_name: null },
    { name: 'יום ירושלים', start_date: '2027-06-04', end_date: '2027-06-04', type: 'holiday', parent_name: null },
    { name: 'שבועות', start_date: '2027-06-11', end_date: '2027-06-11', type: 'holiday', parent_name: null },
    { name: 'תשעה באב', start_date: '2027-08-12', end_date: '2027-08-12', type: 'holiday', parent_name: null },
  ],
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, education_level, school_year, account_id } = await req.json();

    if (!type || !school_year || !account_id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'חסרים פרטים נדרשים: type, school_year, account_id'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (type === 'vacations' && !education_level) {
      return new Response(JSON.stringify({
        success: false,
        error: 'יש לבחור מסגרת לימודים לטעינת חופשות'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        success: false,
        error: 'יש להתחבר כדי לבצע פעולה זו'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAuth = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'אימות נכשל. נסה להתחבר מחדש.'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    const { data: isMember, error: memberError } = await supabase.rpc(
      'is_account_member',
      { user_uuid: user.id, account_uuid: account_id }
    );

    if (memberError || !isMember) {
      return new Response(JSON.stringify({
        success: false,
        error: 'אין הרשאה לחשבון זה'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ===== HOLIDAYS: return from hardcoded data =====
    if (type === 'holidays') {
      const holidays = holidaysByYear[school_year];
      if (!holidays) {
        return new Response(JSON.stringify({
          success: false,
          error: `לא נמצאו נתוני חגים לשנת ${school_year}`
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`✅ Returning ${holidays.length} hardcoded holidays for ${school_year}`);

      return new Response(JSON.stringify({
        success: true,
        items: holidays,
        type,
        school_year
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ===== VACATIONS: fetch from OpenAI =====
    if (!openaiApiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'מפתח OpenAI לא מוגדר'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const educationLevelLabels: Record<string, string> = {
      kindergarten: 'גנים (גן חובה)',
      elementary: 'בית ספר יסודי (כיתות א-ו)',
      middle_school: 'חטיבת ביניים (כיתות ז-ט)',
      high_school: 'תיכון (כיתות י-יב)'
    };

    const levelLabel = educationLevelLabels[education_level] || education_level;

    const systemPrompt = `אתה מומחה בלוח החופשות של משרד החינוך בישראל. 
עליך להחזיר רשימה מדויקת של חופשות בית הספר בלבד (לא חגים).
השתמש **בדיוק** בשמות הבאים ובערכי parent_name:
1. "חופשת סוכות" (parent_name: "סוכות")
2. "חופשת חנוכה" (parent_name: "חנוכה")
3. "חופשת חורף" (parent_name: null) - אם יש הפסקת סמסטר/חורף
4. "חופשת פורים" (parent_name: "פורים") - רק אם רלוונטי למסגרת
5. "חופשת פסח" (parent_name: "פסח")
6. "חופש גדול" (parent_name: null)

אל תשנה את השמות ואת ערכי parent_name. אל תוסיף חופשות שלא ברשימה.
החזר תאריכים לועזיים מדויקים בפורמט YYYY-MM-DD.`;

    const userPrompt = `החזר את רשימת חופשות בית הספר לשנת הלימודים ${school_year} עבור ${levelLabel}, לפי משרד החינוך.
השתמש בדיוק בשמות וב-parent_name שצוינו. סוג כל הפריטים: vacation.
חופשת סוכות מתחילה בערב החג ונמשכת עד סוף שמחת תורה (כולל ימי חול המועד).
חופשת חנוכה מכסה כשבוע-עשרה ימים סביב ימי החנוכה.
חופשת פסח מתחילה לפני ערב הסדר ונמשכת עד סוף שביעי של פסח.
חופש גדול מתחיל ב-1 ביולי (בערך) ונמשך עד 31 באוגוסט.`;

    const openaiBody = {
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'extract_holidays',
            description: 'רשימת חופשות עם תאריכים',
            parameters: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'שם החופשה' },
                      start_date: { type: 'string', description: 'תאריך התחלה YYYY-MM-DD' },
                      end_date: { type: 'string', description: 'תאריך סיום YYYY-MM-DD' },
                      type: { type: 'string', enum: ['vacation'], description: 'תמיד vacation' },
                      parent_name: { type: ['string', 'null'], description: 'שם הקבוצה או null' }
                    },
                    required: ['name', 'start_date', 'end_date', 'type', 'parent_name']
                  }
                }
              },
              required: ['items'],
              additionalProperties: false
            }
          }
        }
      ],
      tool_choice: { type: 'function', function: { name: 'extract_holidays' } },
      max_tokens: 1500
    };

    console.log(`🤖 Calling OpenAI for vacations (${education_level}) - ${school_year}`);

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(openaiBody)
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('❌ OpenAI API error:', errorText);
      return new Response(JSON.stringify({
        success: false,
        error: 'שגיאה בשליפת נתונים מ-OpenAI'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const openaiData = await openaiResponse.json();
    const toolCall = openaiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== 'extract_holidays') {
      return new Response(JSON.stringify({
        success: false,
        error: 'לא התקבלה תשובה מובנית מ-OpenAI'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let result;
    try {
      result = JSON.parse(toolCall.function.arguments);
    } catch {
      return new Response(JSON.stringify({
        success: false,
        error: 'שגיאה בפענוח התשובה מ-OpenAI'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!result.items || !Array.isArray(result.items) || result.items.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'לא נמצאו נתונים'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Enforce correct names and parent_name values
    const allowedVacations: Record<string, string | null> = {
      'חופשת סוכות': 'סוכות',
      'חופשת חנוכה': 'חנוכה',
      'חופשת חורף': null,
      'חופשת פורים': 'פורים',
      'חופשת פסח': 'פסח',
      'חופש גדול': null,
    };

    const validatedItems = result.items
      .filter((item: any) => item.name in allowedVacations)
      .map((item: any) => ({
        ...item,
        type: 'vacation',
        parent_name: allowedVacations[item.name] ?? null,
      }));

    console.log(`✅ Got ${validatedItems.length} validated vacation items from OpenAI`);

    return new Response(JSON.stringify({
      success: true,
      items: validatedItems,
      type,
      education_level,
      school_year
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'שגיאה לא צפויה',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
