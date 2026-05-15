import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { generateOTPCode, isValidIsraeliMobile, getCallerIp, hashOtpCode } from '../_shared/otp-utils.ts';

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
    const { phoneNumber, type, userId } = await req.json();
    
    console.log(`OTP Send: Request for ${phoneNumber}, type: ${type}`);

    if (!phoneNumber || !type) {
      return new Response(
        JSON.stringify({ error: 'Phone number and type are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vonageApiKey = Deno.env.get('VONAGE_API_KEY');
    const vonageApiSecret = Deno.env.get('VONAGE_API_SECRET');
    const vonageFromNumber = Deno.env.get('VONAGE_FROM_NUMBER');

    if (!vonageApiKey || !vonageApiSecret || !vonageFromNumber) {
      console.error('Missing Vonage credentials');
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Normalize phone number to E.164 before rate limiting and DB queries
    let normalizedPhone: string;
    try {
      // Dynamic import for libphonenumber-js
      const { parsePhoneNumber } = await import('https://esm.sh/libphonenumber-js@1.10.51');
      const parsed = parsePhoneNumber(phoneNumber, 'IL');
      normalizedPhone = parsed ? parsed.format('E.164') : phoneNumber;
      console.log('OTP Send: Phone normalization:', { original: phoneNumber, normalized: normalizedPhone });
    } catch (error) {
      console.log('OTP Send: Phone parsing failed, using original:', phoneNumber);
      normalizedPhone = phoneNumber;
    }

    // Reject landlines/non-Israeli-mobile numbers up-front — Vonage silently
    // accepts but never delivers SMS to landlines, so we'd otherwise burn budget
    // on guaranteed-dead messages.
    if (!isValidIsraeliMobile(normalizedPhone)) {
      console.warn(`OTP Send: rejecting non-mobile number ${normalizedPhone}`);
      return new Response(
        JSON.stringify({ error: 'ניתן לשלוח קוד רק למספר טלפון נייד ישראלי תקין.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callerIp = getCallerIp(req);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Rate limit 1: max 5 SMS per phone number per hour.
    const { count: smsCount, error: countError } = await supabase
      .from('sms_verification_codes')
      .select('*', { count: 'exact', head: true })
      .eq('phone_number', normalizedPhone)
      .gte('created_at', oneHourAgo);

    if (!countError && smsCount !== null && smsCount >= 5) {
      console.warn(`OTP Send: per-phone rate limit hit for ${normalizedPhone}: ${smsCount}/h`);
      return new Response(
        JSON.stringify({ error: 'יותר מדי בקשות. אנא נסה שוב מאוחר יותר.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit 2: max 20 SMS per caller IP per hour — blocks the "one
    // attacker, many phone numbers" abuse pattern where a per-phone limit
    // alone wouldn't trigger. Skip when IP is unknown to avoid false denials.
    if (callerIp) {
      const { count: ipCount } = await supabase
        .from('sms_verification_codes')
        .select('*', { count: 'exact', head: true })
        .eq('ip_address', callerIp)
        .gte('created_at', oneHourAgo);

      if (ipCount !== null && ipCount >= 20) {
        console.warn(`OTP Send: per-IP rate limit hit for ${callerIp}: ${ipCount}/h`);
        return new Response(
          JSON.stringify({ error: 'יותר מדי בקשות מכתובת זו. אנא נסה שוב מאוחר יותר.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // If a valid code is still active, we can no longer "resend" the same
    // code (it's now stored as an HMAC hash and the plaintext exists only
    // on the user's phone from the original SMS). Instead, return success
    // without sending another SMS — the user already has a working code.
    const { data: existingCode } = await supabase
      .from('sms_verification_codes')
      .select('id, expires_at')
      .eq('phone_number', normalizedPhone)
      .eq('verification_type', type)
      .eq('verified', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingCode) {
      console.log(`OTP Send: active code already exists for ${normalizedPhone}, no new SMS`);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'קוד אימות פעיל כבר נשלח. בדוק את הודעות ה-SMS שלך.',
          expiresAt: existingCode.expires_at,
          reused: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a fresh code, hash it, store the hash, SMS the plaintext.
    const otpCode = generateOTPCode();
    const expiration = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const expiresAt = expiration.toISOString();
    const codeHash = await hashOtpCode(otpCode, normalizedPhone);

    const { error: insertError } = await supabase
      .from('sms_verification_codes')
      .insert({
        phone_number: normalizedPhone,
        code: codeHash,
        verification_type: type,
        expires_at: expiresAt,
        verified: false,
        attempts: 0,
        user_id: userId || null,
        ip_address: callerIp,
      });

    if (insertError) {
      console.error('Error storing OTP code:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store verification code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`OTP Send: Created new code for ${normalizedPhone}`);

    // Send SMS via Vonage
    const smsMessage = `קוד האימות שלך: ${otpCode}\nתוקף: 10 דקות`;
    
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
        text: smsMessage,
        type: 'unicode'
      }),
    });

    const vonageResult = await vonageResponse.json();
    
    console.log('Vonage response:', JSON.stringify(vonageResult));
    
    // Vonage returns status in messages array
    if (vonageResult.messages && vonageResult.messages[0]?.status === '0') {
      console.log(`OTP Send: SMS sent successfully to ${normalizedPhone}. Message ID: ${vonageResult.messages[0]['message-id']}`);
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'קוד האימות נשלח בהצלחה',
          messageId: vonageResult.messages[0]['message-id'],
          expiresAt: expiresAt
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      const errorText = vonageResult.messages?.[0]?.['error-text'] || 'Unknown error';
      console.error('Vonage error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send SMS', 
          details: errorText 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('OTP Send function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
