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
  console.log('=== REQUEST START ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('STEP 1: Parsing request body');
    const requestBody = await req.json();
    console.log('Request body received:', {
      file_url: requestBody.file_url ? 'present' : 'missing',
      file_name: requestBody.file_name || 'not provided',
      file_size: requestBody.file_size || 'not provided',
      file_type: requestBody.file_type || 'not provided',
      account_id: requestBody.account_id ? 'present' : 'missing'
    });
    
    const { file_url, file_name, file_size, file_type, account_id } = requestBody;

    if (!file_url || !account_id) {
      console.error('VALIDATION ERROR - Missing required fields:', { 
        file_url: !!file_url, 
        account_id: !!account_id 
      });
      throw new Error('Missing required fields: file_url and account_id');
    }

    console.log('STEP 2: Initializing Supabase client');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Environment variables check:', {
      supabaseUrl: !!supabaseUrl,
      supabaseServiceKey: !!supabaseServiceKey,
      supabaseUrlLength: supabaseUrl?.length || 0,
      supabaseServiceKeyLength: supabaseServiceKey?.length || 0
    });
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('ENVIRONMENT ERROR - Missing Supabase environment variables');
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Supabase client initialized successfully');

    console.log('STEP 3: Checking authorization');
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header check:', {
      present: !!authHeader,
      length: authHeader?.length || 0,
      startsWithBearer: authHeader?.startsWith('Bearer ') || false
    });
    
    if (!authHeader) {
      console.error('AUTH ERROR - No authorization header');
      throw new Error('No authorization header');
    }

    console.log('STEP 4: Getting user from token');
    const token = authHeader.replace('Bearer ', '');
    console.log('Token extracted, length:', token.length);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError) {
      console.error('USER ERROR - Auth error:', userError);
      throw new Error(`Authentication failed: ${userError.message}`);
    }
    
    if (!user) {
      console.error('USER ERROR - No user found');
      throw new Error('No user found');
    }

    console.log('STEP 5: User authenticated successfully, ID:', user.id);

    console.log('STEP 6: Checking OpenAI API key');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    console.log('OpenAI API key check:', {
      present: !!openaiApiKey,
      length: openaiApiKey?.length || 0
    });
    
    if (!openaiApiKey) {
      console.error('OPENAI ERROR - API key not found');
      throw new Error('OpenAI API key not found');
    }
    
    console.log('STEP 7: Calling OpenAI API');
    console.log('File URL to analyze:', file_url);
    
    const prompt = `Please analyze this receipt/invoice document and extract the following information in JSON format:
{
  "date": "YYYY-MM-DD format",
  "vendor": "store/company name",
  "total": number (total amount),
  "items": [
    {
      "name": "item name",
      "price": number,
      "quantity": number (if available),
      "category": "food/other classification"
    }
  ],
  "currency": "ILS or other currency code",
  "confidence_score": number (0-100, your confidence in the extraction)
}

Please be as accurate as possible and only include information that is clearly visible in the document.`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that extracts information from receipts and invoices. You can process both images and PDF documents.'
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: file_url } }
            ]
          }
        ],
        max_tokens: 1000
      })
    });

    console.log('OpenAI API response status:', openaiResponse.status);
    console.log('OpenAI API response ok:', openaiResponse.ok);

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OPENAI API ERROR - Response not ok:', {
        status: openaiResponse.status,
        statusText: openaiResponse.statusText,
        errorText: errorText
      });
      throw new Error(`OpenAI API error (${openaiResponse.status}): ${errorText}`);
    }

    console.log('STEP 8: Parsing OpenAI response');
    const openaiData = await openaiResponse.json();
    console.log('OpenAI data structure:', {
      hasChoices: !!openaiData.choices,
      choicesLength: openaiData.choices?.length || 0,
      hasMessage: !!openaiData.choices?.[0]?.message,
      hasContent: !!openaiData.choices?.[0]?.message?.content
    });
    
    const gptContent = openaiData.choices[0]?.message?.content;

    if (!gptContent) {
      console.error('GPT CONTENT ERROR - No content received');
      throw new Error('No content received from GPT');
    }

    console.log('STEP 9: Parsing GPT JSON response');
    console.log('GPT content preview:', gptContent.substring(0, 200) + '...');
    
    let scanResult: ScanResult;
    try {
      const cleanJson = gptContent.replace(/```json\n|\n```/g, '').trim();
      console.log('Cleaned JSON preview:', cleanJson.substring(0, 200) + '...');
      scanResult = JSON.parse(cleanJson);
      console.log('Parsed scan result:', {
        hasDate: !!scanResult.date,
        hasVendor: !!scanResult.vendor,
        hasTotal: !!scanResult.total,
        hasItems: !!scanResult.items,
        itemsLength: scanResult.items?.length || 0
      });
    } catch (parseError) {
      console.error('JSON PARSE ERROR:', parseError);
      console.error('Failed to parse GPT response:', gptContent);
      throw new Error('Failed to parse receipt data from GPT response');
    }

    console.log('STEP 10: Validating scan result');
    if (!scanResult.items || !Array.isArray(scanResult.items) || scanResult.items.length === 0) {
      console.error('VALIDATION ERROR - No items found in scan result');
      throw new Error('לא נמצאו פריטים בחשבונית. נסה תמונה ברורה יותר או הזן את הנתונים ידנית.');
    }

    if (!scanResult.confidence_score) {
      scanResult.confidence_score = 75;
      console.log('Set default confidence score: 75');
    }

    console.log('STEP 11: Saving to database');
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
      console.error('DATABASE SAVE ERROR:', saveError);
      throw new Error(`Failed to save scan result: ${saveError.message}`);
    }

    console.log('STEP 12: Success! Scan completed for receipt ID:', scannedReceipt.id);
    console.log('=== REQUEST SUCCESS ===');

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
    console.error('=== REQUEST FAILED ===');
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    let userMessage = 'אירעה שגיאה בסריקת החשבונית. נסה שוב.';
    
    if (error.message.includes('לא נמצאו פריטים')) {
      userMessage = error.message;
    } else if (error.message.includes('OpenAI')) {
      userMessage = 'שגיאה בשירות הזיהוי. נסה שוב מאוחר יותר.';
    } else if (error.message.includes('Authentication') || error.message.includes('No user')) {
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