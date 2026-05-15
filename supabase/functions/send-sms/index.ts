import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { parsePhoneNumber } from 'https://esm.sh/libphonenumber-js@1.10.51';
import { generateOTPCode, hashOtpCode } from '../_shared/otp-utils.ts';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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

    const { phoneNumber, code, message, type = 'verification', verificationType = 'registration', skipExistingCheck = false } = await req.json();
    console.log(`SMS request received for: ${phoneNumber}, type: ${type}, verificationType: ${verificationType}`);

    if (!phoneNumber) {
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
      const parsed = parsePhoneNumber(phoneNumber, 'IL'); // Default to Israel
      normalizedPhone = parsed ? parsed.format('E.164') : phoneNumber;
      console.log('Phone normalization:', { original: phoneNumber, normalized: normalizedPhone });
    } catch (error) {
      console.log('Phone parsing failed, using original:', phoneNumber);
      normalizedPhone = phoneNumber;
    }

    // Initialize Supabase client early for phone check
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Rate limiting: max 5 SMS per phone number per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: smsCount, error: countError } = await supabase
      .from('sms_verification_codes')
      .select('*', { count: 'exact', head: true })
      .eq('phone_number', normalizedPhone)
      .gte('created_at', oneHourAgo);

    if (!countError && smsCount !== null && smsCount >= 5) {
      console.warn(`Rate limit exceeded for ${normalizedPhone}: ${smsCount} requests in last hour`);
      return new Response(
        JSON.stringify({ error: 'יותר מדי בקשות. אנא נסה שוב מאוחר יותר.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if phone number already exists in the system (for registration type only)
    if (verificationType === 'registration' && !skipExistingCheck) {
      console.log('Checking if phone number exists in profiles...');
      
      // Check by normalized E.164 format
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, phone_e164, phone_number')
        .or(`phone_e164.eq.${normalizedPhone},phone_number.eq.${normalizedPhone}`)
        .limit(1)
        .maybeSingle();
      
      if (profileError) {
        console.error('Error checking existing phone:', profileError);
      }
      
      if (existingProfile) {
        console.log(`Phone number ${normalizedPhone} already exists in profile: ${existingProfile.id}`);
        return new Response(
          JSON.stringify({ 
            error: 'PHONE_EXISTS',
            message: 'מספר הטלפון הזה כבר רשום במערכת',
            existingUserName: existingProfile.name,
            suggestion: 'password_reset'
          }),
          { 
            status: 409, // Conflict
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      console.log('Phone number not found in existing profiles, proceeding with SMS');
    }

    // Note: supabase client already initialized above for phone check

    // If no code provided, always generate a fresh one. We previously tried to
    // reuse an existing active code, but with HMAC hashing at rest we no longer
    // have the plaintext to resend. Generating fresh keeps the SMS deliverable;
    // verify-sms-code picks the latest unverified row so older codes simply
    // become irrelevant once a new one is created.
    let verificationCode = code;
    if (!verificationCode && type === 'verification') {
      const newCode = generateOTPCode();
      const codeHash = await hashOtpCode(newCode, normalizedPhone);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      const { error: insertError } = await supabase
        .from('sms_verification_codes')
        .insert({
          phone_number: normalizedPhone,
          code: codeHash,
          verification_type: verificationType,
          expires_at: expiresAt.toISOString(),
          verified: false,
          attempts: 0
        });

      if (insertError) {
        console.error('Error creating verification code:', insertError);
        throw new Error('Failed to create verification code');
      }

      verificationCode = newCode;
      console.log('Created new verification code for', normalizedPhone);
    }

    // Prepare SMS message
    let smsMessage: string;
    if (message) {
      smsMessage = message;
    } else if (verificationCode) {
      smsMessage = `קוד האימות שלך: ${verificationCode}\nתוקף: 10 דקות`;
    } else {
      smsMessage = 'קוד אימות נשלח מהמערכת';
    }

    console.log(`Sending SMS to ${phoneNumber}: ${smsMessage}`);

    // Remove '+' from phone number for Vonage
    const cleanPhoneNumber = normalizedPhone.replace(/^\+/, '');

    // Send SMS using Vonage
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
    
    // Validate Vonage response structure
    if (!vonageResult?.messages || !Array.isArray(vonageResult.messages) || vonageResult.messages.length === 0) {
      console.error('Unexpected Vonage response structure:', JSON.stringify(vonageResult));
      return new Response(
        JSON.stringify({
          error: 'Failed to send SMS',
          details: 'Unexpected response from SMS provider',
          vonageError: vonageResult
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Vonage returns status in messages array
    if (vonageResult.messages[0]?.status === '0') {
      console.log(`SMS sent successfully via Vonage. Message ID: ${vonageResult.messages[0]['message-id']}`);

      return new Response(
        JSON.stringify({
          success: true,
          messageId: vonageResult.messages[0]['message-id'],
          status: 'sent'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else {
      const errorText = vonageResult.messages[0]?.['error-text'] || 'Unknown error';
      console.error('Vonage error:', errorText);
      console.error('Vonage response status:', vonageResult.messages[0]?.status);
      return new Response(
        JSON.stringify({
          error: 'Failed to send SMS',
          details: errorText,
          vonageError: vonageResult
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('SMS function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
