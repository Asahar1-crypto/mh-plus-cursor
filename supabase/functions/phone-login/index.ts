import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { parsePhoneNumber } from 'https://esm.sh/libphonenumber-js@1.10.51';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Phone login function called');
    
    const { phoneNumber } = await req.json();
    
    if (!phoneNumber) {
      console.error('Missing phone number');
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Normalize phone number using libphonenumber-js
    let normalizedPhone;
    try {
      // Pre-clean: handle common patterns
      let cleaned = phoneNumber.trim()
        .replace(/^\s*00/, '+')           // 00972 -> +972
        .replace(/[^\d+]/g, '');         // Remove all non-digits except +

      // Handle Israeli local format (starting with 0)
      if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
        cleaned = '+972' + cleaned.substring(1);
      }
      
      // Handle Israeli international without + (starting with 972)
      if (cleaned.startsWith('972') && !cleaned.startsWith('+')) {
        cleaned = '+' + cleaned;
      }

      // Parse with libphonenumber-js
      const phoneNumberObj = parsePhoneNumber(cleaned, 'IL');
      
      if (!phoneNumberObj || !phoneNumberObj.isValid()) {
        throw new Error('Invalid phone number format');
      }

      normalizedPhone = phoneNumberObj.number; // Returns E.164 format
    } catch (error) {
      console.error('Phone normalization error:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid phone number format' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if phone number exists in profiles - search both phone_e164 and phone_number fields
    // Use separate queries to avoid filter injection via .or() string interpolation
    let profile = null;
    const { data: profileByE164, error: e164Error } = await supabase
      .from('profiles')
      .select('id, name, phone_e164, phone_number')
      .eq('phone_e164', normalizedPhone)
      .maybeSingle();

    if (e164Error) {
      console.error('Error checking profile by e164:', e164Error.message);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    profile = profileByE164;

    if (!profile) {
      const { data: profileByPhone, error: phoneError } = await supabase
        .from('profiles')
        .select('id, name, phone_e164, phone_number')
        .eq('phone_number', normalizedPhone)
        .maybeSingle();

      if (phoneError) {
        console.error('Error checking profile by phone:', phoneError.message);
        return new Response(
          JSON.stringify({ error: 'Database error' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      profile = profileByPhone;
    }

    if (!profile) {
      return new Response(
        JSON.stringify({
          error: 'Phone number not registered',
          message: 'מספר הטלפון לא רשום במערכת. אנא הירשם תחילה או בדוק את המספר.',
          suggestion: 'register'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Profile found for phone login, userId:', profile.id);

    // Rate limiting: max 3 OTP requests per phone number in the last 10 minutes
    const { data: recentCodes, error: rateError } = await supabase
      .from('sms_verification_codes')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .eq('verification_type', 'login')
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());

    if (rateError) {
      console.error('Rate limit check error:', rateError.message);
    }

    if (recentCodes && recentCodes.length >= 3) {
      console.log('Rate limit exceeded for phone login');
      return new Response(
        JSON.stringify({
          error: 'Too many attempts',
          message: 'נשלחו יותר מדי קודים. נסה שוב בעוד 10 דקות.'
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in database
    const { error: storeError } = await supabase
      .from('sms_verification_codes')
      .insert({
        phone_number: normalizedPhone,
        code: otpCode,
        verification_type: 'login',
        user_id: profile.id,
        verified: false,
        attempts: 0,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
      });

    if (storeError) {
      console.error('Error storing OTP:', storeError);
      return new Response(
        JSON.stringify({ error: 'Failed to store verification code' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('OTP stored successfully');

    // Send SMS via Vonage
    const vonageApiKey = Deno.env.get('VONAGE_API_KEY');
    const vonageApiSecret = Deno.env.get('VONAGE_API_SECRET');
    const vonageFromNumber = Deno.env.get('VONAGE_FROM_NUMBER');

    if (!vonageApiKey || !vonageApiSecret || !vonageFromNumber) {
      console.error('Missing Vonage configuration');
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const message = `קוד הכניסה שלך: ${otpCode}\nתוקף: 10 דקות\nלא תשתף את הקוד עם אחרים`;

    // Remove '+' from phone number for Vonage
    const cleanPhoneNumber = normalizedPhone.replace(/^\+/, '');

    const vonageResponse = await fetch('https://rest.nexmo.com/sms/json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: vonageApiKey,
        api_secret: vonageApiSecret,
        from: vonageFromNumber,
        to: cleanPhoneNumber,
        text: message,
        type: 'unicode'
      }),
    });

    const vonageResult = await vonageResponse.json();
    
    console.log('Vonage response status:', vonageResult.messages?.[0]?.status);
    
    // Vonage returns status in messages array
    if (!vonageResult.messages || vonageResult.messages[0]?.status !== '0') {
      const errorText = vonageResult.messages?.[0]?.['error-text'] || 'Unknown error';
      console.error('Vonage error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to send SMS' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('SMS sent successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'OTP sent successfully',
        userId: profile.id,
        userName: profile.name
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in phone-login function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
