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
  console.log('Function started - method:', req.method);
  
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response(null, { headers: corsHeaders });
  }

  let requestBody;
  try {
    console.log('Parsing request body...');
    requestBody = await req.json();
    console.log('Request body parsed successfully');
  } catch (e) {
    console.error('Failed to parse request body:', e);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Invalid request body' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { file_url, file_name, file_size, file_type, account_id } = requestBody;
    console.log('Extracted fields from request:', {
      file_url: file_url ? 'present' : 'missing',
      account_id: account_id ? 'present' : 'missing'
    });

    if (!file_url || !account_id) {
      console.error('Missing required fields');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing required fields: file_url and account_id' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    console.log('Environment variables check:', {
      supabaseUrl: supabaseUrl ? 'present' : 'missing',
      supabaseServiceKey: supabaseServiceKey ? 'present' : 'missing',
      openaiApiKey: openaiApiKey ? 'present' : 'missing'
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing Supabase configuration' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!openaiApiKey) {
      console.error('Missing OpenAI API key');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing OpenAI API key configuration' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client
    console.log('Initializing Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No authorization header' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Getting user from token...');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('User authentication failed:', userError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Authentication failed' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('User authenticated successfully, calling OpenAI...');

    // Call OpenAI API
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

    console.log('OpenAI response status:', openaiResponse.status);

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'OpenAI API error' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const openaiData = await openaiResponse.json();
    const gptContent = openaiData.choices[0]?.message?.content;

    if (!gptContent) {
      console.error('No content from OpenAI');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No content received from OpenAI' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Parsing OpenAI response...');
    let scanResult: ScanResult;
    try {
      const cleanJson = gptContent.replace(/```json\n|\n```/g, '').trim();
      scanResult = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to parse AI response' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate scan result
    if (!scanResult.items || !Array.isArray(scanResult.items) || scanResult.items.length === 0) {
      console.error('No items found in scan result');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'לא נמצאו פריטים בחשבונית. נסה תמונה ברורה יותר או הזן את הנתונים ידנית.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Set default confidence score if not provided
    if (!scanResult.confidence_score) {
      scanResult.confidence_score = 75;
    }

    console.log('Saving to database...');
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
      console.error('Database save error:', saveError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to save scan result' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Scan completed successfully');
    return new Response(JSON.stringify({
      success: true,
      scan_id: scannedReceipt.id,
      result: scanResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});