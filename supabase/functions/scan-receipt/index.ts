import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ErrorCategory =
  | 'openai_quota' | 'openai_rate_limit' | 'openai_auth' | 'openai_model' | 'openai_other'
  | 'image_unreadable' | 'validation' | 'auth_failed' | 'authz_failed'
  | 'db_error' | 'config_missing' | 'unknown';

interface LogErrorOpts {
  adminClient: SupabaseClient;
  category: ErrorCategory;
  errorCode?: string | null;
  userMessage: string;
  rawDetails?: unknown;
  userId?: string | null;
  accountId?: string | null;
  requestMetadata?: Record<string, unknown> | null;
  httpStatus: number;
}

// Logs the error to system_errors (best-effort, never masks the real failure)
// and returns a Response carrying only the friendly userMessage. Full upstream
// details stay server-side and surface to super admins via /admin/system-errors.
async function respondWithError(opts: LogErrorOpts): Promise<Response> {
  const {
    adminClient, category, errorCode, userMessage, rawDetails,
    userId, accountId, requestMetadata, httpStatus,
  } = opts;

  try {
    await adminClient.from('system_errors').insert({
      function_name: 'scan-receipt',
      error_category: category,
      error_code: errorCode ?? null,
      user_message: userMessage,
      raw_details: rawDetails ?? {},
      user_id: userId ?? null,
      account_id: accountId ?? null,
      request_metadata: requestMetadata ?? null,
      http_status: httpStatus,
    });
  } catch (logErr) {
    console.error('💥 Failed to log system error:', logErr);
  }

  return new Response(
    JSON.stringify({ success: false, error: userMessage }),
    { status: httpStatus, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

// Parse OpenAI's error JSON and map it to category + friendly Hebrew message.
function classifyOpenAIError(status: number, errorText: string): {
  category: ErrorCategory;
  code: string | null;
  parsedDetails: unknown;
  userMessage: string;
} {
  let parsedDetails: unknown = errorText;
  let code: string | null = null;
  try {
    const parsed = JSON.parse(errorText);
    parsedDetails = parsed;
    code = parsed?.error?.code ?? null;
  } catch { /* leave as raw text */ }

  if (code === 'insufficient_quota') {
    return {
      category: 'openai_quota', code, parsedDetails,
      userMessage: 'שירות הסריקה אינו זמין כרגע. נסו שוב מאוחר יותר או הזינו את ההוצאה ידנית.',
    };
  }
  if (code === 'rate_limit_exceeded') {
    return {
      category: 'openai_rate_limit', code, parsedDetails,
      userMessage: 'יש עומס על שירות הסריקה. נסו שוב בעוד דקה.',
    };
  }
  if (code === 'invalid_api_key' || status === 401) {
    return {
      category: 'openai_auth', code, parsedDetails,
      userMessage: 'שירות הסריקה אינו זמין כרגע. נסו שוב מאוחר יותר.',
    };
  }
  if (code === 'model_not_found') {
    return {
      category: 'openai_model', code, parsedDetails,
      userMessage: 'שירות הסריקה אינו זמין כרגע. נסו שוב מאוחר יותר.',
    };
  }
  return {
    category: 'openai_other', code, parsedDetails,
    userMessage: 'שירות הסריקה אינו זמין כרגע. נסו שוב מאוחר יותר או הזינו את ההוצאה ידנית.',
  };
}

// Strip the signed-URL token before persisting — that token can re-fetch the
// user's receipt for 10 minutes.
function redactSignedUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.searchParams.has('token')) u.searchParams.set('token', '[REDACTED]');
    return u.toString();
  } catch {
    return '[unparseable url]';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Service-role client created up front so even the earliest error paths
  // (validation/config) can log.
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  let parsedUserId: string | null = null;
  let parsedAccountId: string | null = null;
  let parsedFileSize: number | null = null;
  let parsedFileType: string | null = null;

  try {
    const requestBody = await req.json();
    const { file_url, file_name, file_size, file_type, account_id } = requestBody;
    parsedAccountId = account_id ?? null;
    parsedFileSize = typeof file_size === 'number' ? file_size : null;
    parsedFileType = typeof file_type === 'string' ? file_type : null;

    const baseMeta = {
      file_name: file_name ?? null,
      file_size: parsedFileSize,
      file_type: parsedFileType,
      file_url_redacted: redactSignedUrl(file_url),
    };

    if (!file_url || !account_id) {
      return await respondWithError({
        adminClient, category: 'validation',
        userMessage: 'חסרים פרטים נדרשים. נסו שוב.',
        rawDetails: { missing: { file_url: !file_url, account_id: !account_id } },
        accountId: parsedAccountId, requestMetadata: baseMeta, httpStatus: 400,
      });
    }

    if (!openaiApiKey) {
      return await respondWithError({
        adminClient, category: 'config_missing', errorCode: 'OPENAI_API_KEY_missing',
        userMessage: 'שירות הסריקה אינו זמין כרגע. ננסה לתקן זאת בהקדם.',
        rawDetails: { missing_env: 'OPENAI_API_KEY' },
        accountId: parsedAccountId, requestMetadata: baseMeta, httpStatus: 500,
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return await respondWithError({
        adminClient, category: 'auth_failed',
        userMessage: 'יש להתחבר כדי לסרוק חשבונית.',
        rawDetails: { reason: 'missing_authorization_header' },
        accountId: parsedAccountId, requestMetadata: baseMeta, httpStatus: 401,
      });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return await respondWithError({
        adminClient, category: 'auth_failed',
        userMessage: 'פג תוקף ההתחברות. רעננו את הדף והתחברו מחדש.',
        rawDetails: { reason: userError?.message ?? 'getUser returned no user' },
        accountId: parsedAccountId, requestMetadata: baseMeta, httpStatus: 401,
      });
    }
    parsedUserId = user.id;

    const { data: isMember, error: memberError } = await adminClient.rpc(
      'is_account_member',
      { user_uuid: user.id, account_uuid: account_id },
    );
    if (memberError) {
      return await respondWithError({
        adminClient, category: 'db_error', errorCode: 'is_account_member_rpc',
        userMessage: 'שגיאה זמנית בבדיקת הרשאות. נסו שוב.',
        rawDetails: { rpc_error: memberError.message },
        userId: parsedUserId, accountId: parsedAccountId,
        requestMetadata: baseMeta, httpStatus: 500,
      });
    }
    if (!isMember) {
      return await respondWithError({
        adminClient, category: 'authz_failed',
        userMessage: 'אין לך הרשאה לחשבון זה.',
        rawDetails: { user_id: user.id, account_id },
        userId: parsedUserId, accountId: parsedAccountId,
        requestMetadata: baseMeta, httpStatus: 403,
      });
    }

    const systemPrompt = `אתה מומחה בקריאת חשבוניות וקבלות בעברית ובאנגלית.
המשימה שלך פשוטה: חלץ 3 נתונים בלבד מהחשבונית:
1. סה"כ לתשלום (המספר הסופי שהלקוח שילם)
2. שם העסק/ספק
3. תאריך העסקה

חפש את המילים: "סה"כ", "לתשלום", "total", "סכום כולל", "grand total".
אם יש מע"מ, קח את הסכום הסופי כולל מע"מ.
אם לא מצאת תאריך, השתמש בתאריך היום.
היה מדויק - עדיף לא לנחש.`;
    const userPrompt = `קרא את החשבונית הזו והחזר את הסה"כ, שם העסק והתאריך.`;

    const openaiBody = {
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: file_url } },
          ],
        },
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'extract_receipt_data',
          description: 'חילוץ נתונים מחשבונית',
          parameters: {
            type: 'object',
            properties: {
              total: { type: 'number', description: 'סה"כ לתשלום בשקלים' },
              vendor: { type: 'string', description: 'שם העסק או הספק' },
              date: { type: 'string', description: 'תאריך העסקה בפורמט YYYY-MM-DD' },
              confidence_score: { type: 'number', description: 'רמת הביטחון (0-100)' },
            },
            required: ['total', 'vendor', 'date', 'confidence_score'],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: 'function', function: { name: 'extract_receipt_data' } },
      max_tokens: 500,
    };

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(openaiBody),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      const { category, code, parsedDetails, userMessage } = classifyOpenAIError(
        openaiResponse.status, errorText,
      );
      console.error('❌ OpenAI API error:', { status: openaiResponse.status, code, category });
      return await respondWithError({
        adminClient, category, errorCode: code,
        userMessage, rawDetails: { http_status: openaiResponse.status, body: parsedDetails },
        userId: parsedUserId, accountId: parsedAccountId,
        requestMetadata: { ...baseMeta, openai_status: openaiResponse.status },
        httpStatus: 500,
      });
    }

    const openaiData = await openaiResponse.json();
    const toolCall = openaiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'extract_receipt_data') {
      return await respondWithError({
        adminClient, category: 'image_unreadable', errorCode: 'no_tool_call',
        userMessage: 'לא הצלחנו לקרוא את החשבונית. נסו תמונה ברורה יותר.',
        rawDetails: { reason: 'OpenAI did not return a tool call', response: openaiData },
        userId: parsedUserId, accountId: parsedAccountId,
        requestMetadata: baseMeta, httpStatus: 400,
      });
    }

    let scanResult: { total?: number; vendor?: string; date?: string; confidence_score?: number };
    try {
      scanResult = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      return await respondWithError({
        adminClient, category: 'openai_other', errorCode: 'tool_call_parse_error',
        userMessage: 'שגיאה זמנית בעיבוד החשבונית. נסו שוב.',
        rawDetails: {
          reason: (parseError as Error)?.message ?? 'unknown',
          raw_arguments: toolCall.function.arguments,
        },
        userId: parsedUserId, accountId: parsedAccountId,
        requestMetadata: baseMeta, httpStatus: 500,
      });
    }

    if (!scanResult.total || scanResult.total <= 0) {
      return await respondWithError({
        adminClient, category: 'image_unreadable', errorCode: 'invalid_total',
        userMessage: 'לא זוהה סכום תקין בחשבונית. נסו תמונה ברורה יותר.',
        rawDetails: { scan_result: scanResult },
        userId: parsedUserId, accountId: parsedAccountId,
        requestMetadata: baseMeta, httpStatus: 400,
      });
    }

    if (!scanResult.confidence_score) scanResult.confidence_score = 75;
    if (!scanResult.vendor) scanResult.vendor = 'עסק לא מזוהה';
    if (!scanResult.date) scanResult.date = new Date().toISOString().split('T')[0];

    const formattedResult = {
      total: scanResult.total,
      vendor: scanResult.vendor,
      date: scanResult.date,
      confidence_score: scanResult.confidence_score,
      currency: 'ILS',
      items: [],
    };

    const { data: scannedReceipt, error: saveError } = await adminClient
      .from('scanned_receipts')
      .insert({
        user_id: user.id,
        account_id,
        file_url,
        file_name: file_name || 'receipt',
        file_size: file_size || 0,
        file_type: file_type || 'image',
        gpt_response: formattedResult,
        confidence_score: formattedResult.confidence_score,
        processed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveError) {
      return await respondWithError({
        adminClient, category: 'db_error', errorCode: 'scanned_receipts_insert',
        userMessage: 'שגיאה בשמירת התוצאות. נסו שוב.',
        rawDetails: { db_error: saveError.message, scan_result: formattedResult },
        userId: parsedUserId, accountId: parsedAccountId,
        requestMetadata: baseMeta, httpStatus: 500,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      scan_id: scannedReceipt.id,
      result: formattedResult,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return await respondWithError({
      adminClient, category: 'unknown', errorCode: 'unhandled_exception',
      userMessage: 'אירעה שגיאה לא צפויה. ננסה לתקן זאת בהקדם.',
      rawDetails: { message: (error as Error)?.message, stack: (error as Error)?.stack },
      userId: parsedUserId, accountId: parsedAccountId,
      requestMetadata: { file_size: parsedFileSize, file_type: parsedFileType },
      httpStatus: 500,
    });
  }
});
