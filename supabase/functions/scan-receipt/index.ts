import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 Function started - method:', req.method);
  
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling OPTIONS request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📝 Parsing request body...');
    const requestBody = await req.json();
    console.log('📦 Request body:', {
      file_url: requestBody.file_url ? 'present' : 'missing',
      file_name: requestBody.file_name || 'not provided',
      file_size: requestBody.file_size || 'not provided',
      file_type: requestBody.file_type || 'not provided',
      account_id: requestBody.account_id ? 'present' : 'missing'
    });

    const { file_url, file_path, file_name, file_size, file_type, account_id } = requestBody;

    if (!file_url || !account_id) {
      console.error('❌ Missing required fields');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'חסרים פרטים נדרשים. נסה שוב.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    console.log('🔍 Environment variables check:', {
      supabaseUrl: supabaseUrl ? 'present' : 'missing',
      supabaseServiceKey: supabaseServiceKey ? 'present' : 'missing',
      supabaseAnonKey: supabaseAnonKey ? 'present' : 'missing',
      openaiApiKey: openaiApiKey ? 'present' : 'missing',
      openaiKeyLength: openaiApiKey ? openaiApiKey.length : 0
    });

    if (!openaiApiKey) {
      console.error('❌ OpenAI API key is missing');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'מפתח OpenAI לא מוגדר. הוסף OPENAI_API_KEY ב-Supabase Dashboard > Edge Functions > scan-receipt > Secrets'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No authorization header');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'יש להתחבר כדי לסרוק חשבונית. נסה להתחבר מחדש.' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extract JWT token from Authorization header
    const token = authHeader.replace('Bearer ', '');
    console.log('🔑 Token extracted, length:', token.length);

    // Create anon client for auth verification (with user's token)
    const supabaseAuth = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: authHeader
        }
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verify the user's JWT token
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ User authentication failed:', userError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'אימות נכשל. נסה להתחבר מחדש.' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ User authenticated successfully:', user.id);

    // Create service role client for database operations (bypasses RLS)
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // 🔒 SECURITY: Verify user is a member of the requested account
    console.log('🔐 Verifying account membership...');
    const { data: isMember, error: memberError } = await supabase.rpc(
      'is_account_member',
      { user_uuid: user.id, account_uuid: account_id }
    );

    if (memberError) {
      console.error('❌ Membership check error:', memberError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to verify account membership' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!isMember) {
      console.error('❌ Access denied: User', user.id, 'is not a member of account', account_id);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Access denied: Not a member of this account' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Account membership verified');

    // Call OpenAI API with Tool Calling for structured output
    console.log('🤖 Calling OpenAI API with Tool Calling...');
    
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
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: file_url } }
          ]
        }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'extract_receipt_data',
            description: 'חילוץ נתונים מחשבונית',
            parameters: {
              type: 'object',
              properties: {
                total: {
                  type: 'number',
                  description: 'סה"כ לתשלום בשקלים (המספר הסופי שהלקוח שילם)'
                },
                vendor: {
                  type: 'string',
                  description: 'שם העסק או הספק'
                },
                date: {
                  type: 'string',
                  description: 'תאריך העסקה בפורמט YYYY-MM-DD'
                },
                confidence_score: {
                  type: 'number',
                  description: 'רמת הביטחון בזיהוי (0-100)'
                }
              },
              required: ['total', 'vendor', 'date', 'confidence_score'],
              additionalProperties: false
            }
          }
        }
      ],
      tool_choice: { type: 'function', function: { name: 'extract_receipt_data' } },
      max_tokens: 500
    };

    console.log('📤 OpenAI request with Tool Calling');

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(openaiBody)
    });

    console.log('📥 OpenAI response:', {
      status: openaiResponse.status,
      ok: openaiResponse.ok,
      statusText: openaiResponse.statusText
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('❌ OpenAI API error details:', {
        status: openaiResponse.status,
        statusText: openaiResponse.statusText,
        errorText: errorText
      });
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'OpenAI API error',
        details: errorText
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const openaiData = await openaiResponse.json();
    console.log('✅ OpenAI response received');

    // Extract tool call result
    const toolCall = openaiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || toolCall.function.name !== 'extract_receipt_data') {
      console.error('❌ No tool call in response');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'לא הצלחנו לקרוא את החשבונית. נסה תמונה ברורה יותר.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let scanResult;
    try {
      scanResult = JSON.parse(toolCall.function.arguments);
      console.log('✅ Tool call parsed successfully:', scanResult);
    } catch (parseError) {
      console.error('❌ Tool call parsing error:', parseError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'שגיאה בעיבוד התוצאות' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate scan result
    if (!scanResult.total || scanResult.total <= 0) {
      console.error('❌ Invalid total in scan result:', scanResult.total);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'לא זוהה סכום תקין בחשבונית. נסה תמונה ברורה יותר.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Set defaults
    if (!scanResult.confidence_score) {
      scanResult.confidence_score = 75;
    }
    if (!scanResult.vendor) {
      scanResult.vendor = 'עסק לא מזוהה';
    }
    if (!scanResult.date) {
      scanResult.date = new Date().toISOString().split('T')[0];
    }

    // Format result for frontend compatibility (keeping items array for backward compatibility)
    const formattedResult = {
      total: scanResult.total,
      vendor: scanResult.vendor,
      date: scanResult.date,
      confidence_score: scanResult.confidence_score,
      currency: 'ILS',
      items: [] // Empty - we now focus on the total only
    };

    console.log('💾 Saving to database...');
    const { data: scannedReceipt, error: saveError } = await supabase
      .from('scanned_receipts')
      .insert({
        user_id: user.id,
        account_id,
        file_url,
        file_path: file_path || null,
        file_name: file_name || 'receipt',
        file_size: file_size || 0,
        file_type: file_type || 'image',
        gpt_response: formattedResult,
        confidence_score: formattedResult.confidence_score,
        processed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) {
      console.error('❌ Database save error:', saveError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to save scan result' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🎉 Scan completed successfully!', {
      total: formattedResult.total,
      vendor: formattedResult.vendor,
      date: formattedResult.date,
      confidence: formattedResult.confidence_score
    });
    
    return new Response(JSON.stringify({
      success: true,
      scan_id: scannedReceipt.id,
      result: formattedResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'An unexpected error occurred',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
