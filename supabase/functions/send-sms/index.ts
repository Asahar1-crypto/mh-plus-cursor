import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
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

    // If no code provided, find the latest verification code for this phone number
    let verificationCode = code;
    if (!verificationCode && type === 'verification') {
      // First try to find existing valid code
      const { data: codeData } = await supabase
        .from('sms_verification_codes')
        .select('code')
        .eq('phone_number', normalizedPhone)
        .eq('verification_type', verificationType)
        .eq('verified', false)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (codeData?.code) {
        verificationCode = codeData.code;
        console.log('Found existing verification code:', verificationCode);
      } else {
        // No valid code found, create a new one
        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
        
        const { error: insertError } = await supabase
          .from('sms_verification_codes')
          .insert({
            phone_number: normalizedPhone,
            code: newCode,
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
        console.log('Created new verification code:', verificationCode);
      }
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
    
    // Vonage returns status in messages array
    if (vonageResult.messages && vonageResult.messages[0]?.status === '0') {
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
      const errorText = vonageResult.messages?.[0]?.['error-text'] || 'Unknown error';
      console.error('Vonage error:', errorText);
      console.error('Vonage response status:', vonageResult.messages?.[0]?.status);
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
