import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScannedItem {
  name: string;
  price: number;
  quantity?: number;
  category: string;
}

interface ScanResult {
  date: string;
  vendor: string;
  total: number;
  items: ScannedItem[];
  confidence_score?: number;
  currency?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file_url, file_name, file_size, file_type, account_id } = await req.json();

    if (!file_url || !account_id) {
      throw new Error('Missing required fields: file_url and account_id');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    console.log('Processing receipt scan for user:', user.id);

    // Prepare GPT-4o Vision prompt
    const systemPrompt = `אתה עוזר פיננסי מקצועי שמנתח חשבוניות. המטרה שלך היא לזהות ולחלץ נתונים מחשבוניות בצורה מדויקת.

הוראות:
1. זהה את התאריך, שם הספק, והסכום הכולל
2. עבור כל פריט ברשימה - חלץ: שם, מחיר, כמות (אם מצוינת)
3. שייך לכל פריט אחת מהקטגוריות: מזון, ביגוד, חינוך, בריאות, ציוד תינוקות, משחקים, ספרים, אחר
4. אם החשבונית מטושטשת או לא ברורה - ציין confidence_score נמוך
5. החזר תשובה בפורמט JSON בלבד, ללא הסברים נוספים

פורמט פלט נדרש:
{
  "date": "YYYY-MM-DD",
  "vendor": "שם הספק",
  "total": מספר,
  "currency": "ILS",
  "confidence_score": 1-100,
  "items": [
    {
      "name": "שם הפריט",
      "price": מחיר,
      "quantity": כמות (אופציונלי),
      "category": "קטגוריה"
    }
  ]
}`;

    // Call GPT-4o Vision API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'נא לנתח את החשבונית המצורפת ולהחזיר את הנתונים בפורמט JSON.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: file_url
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('OpenAI API Error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const openaiData = await openaiResponse.json();
    const gptContent = openaiData.choices[0]?.message?.content;

    if (!gptContent) {
      throw new Error('No content received from GPT');
    }

    // Parse GPT response
    let scanResult: ScanResult;
    try {
      // Remove any markdown formatting if present
      const cleanJson = gptContent.replace(/```json\n|\n```/g, '').trim();
      scanResult = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('Failed to parse GPT response:', gptContent);
      throw new Error('Failed to parse receipt data from GPT response');
    }

    // Validate scan result
    if (!scanResult.items || !Array.isArray(scanResult.items) || scanResult.items.length === 0) {
      throw new Error('לא נמצאו פריטים בחשבונית. נסה תמונה ברורה יותר או הזן את הנתונים ידנית.');
    }

    // Set default confidence score if not provided
    if (!scanResult.confidence_score) {
      scanResult.confidence_score = 75; // Default moderate confidence
    }

    // Save scan result to database
    const { data: scannedReceipt, error: saveError } = await supabase
      .from('scanned_receipts')
      .insert({
        user_id: user.id,
        account_id,
        file_url,
        file_name: file_name || 'receipt',
        file_size: file_size || 0,
        file_type: file_type || 'image',
        gpt_response: scanResult,
        confidence_score: scanResult.confidence_score,
        processed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving scan result:', saveError);
      throw new Error('Failed to save scan result');
    }

    console.log('Receipt scan completed successfully:', scannedReceipt.id);

    return new Response(
      JSON.stringify({
        success: true,
        scan_id: scannedReceipt.id,
        result: scanResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Receipt scan error:', error);
    
    // Provide user-friendly error messages
    let userMessage = 'אירעה שגיאה בסריקת החשבונית. נסה שוב.';
    
    if (error.message.includes('לא נמצאו פריטים')) {
      userMessage = error.message;
    } else if (error.message.includes('OpenAI')) {
      userMessage = 'שגיאה בשירות הזיהוי. נסה שוב מאוחר יותר.';
    } else if (error.message.includes('Invalid user')) {
      userMessage = 'אנא התחבר מחדש לחשבון.';
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: userMessage,
        details: error.message 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});