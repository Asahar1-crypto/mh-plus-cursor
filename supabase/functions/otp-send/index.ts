import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate 6-digit OTP code
function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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

    // Check for existing valid code first
    const { data: existingCode } = await supabase
      .from('sms_verification_codes')
      .select('code, expires_at')
      .eq('phone_number', phoneNumber)
      .eq('verification_type', type)
      .eq('verified', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let otpCode: string;
    let expiresAt: string;

    if (existingCode) {
      // Use existing valid code
      otpCode = existingCode.code;
      expiresAt = existingCode.expires_at;
      console.log(`OTP Send: Using existing code for ${phoneNumber}`);
    } else {
      // Generate new code
      otpCode = generateOTPCode();
      const expiration = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      expiresAt = expiration.toISOString();

      // Store in database
      const { error: insertError } = await supabase
        .from('sms_verification_codes')
        .insert({
          phone_number: phoneNumber,
          code: otpCode,
          verification_type: type,
          expires_at: expiresAt,
          verified: false,
          attempts: 0,
          user_id: userId || null
        });

      if (insertError) {
        console.error('Error storing OTP code:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to store verification code' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log(`OTP Send: Created new code for ${phoneNumber}`);
    }

    // Send SMS via Vonage
    const smsMessage = `קוד האימות שלך: ${otpCode}\nתוקף: 10 דקות`;
    
    // Remove '+' from phone number for Vonage
    const cleanPhoneNumber = phoneNumber.replace(/^\+/, '');
    
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
      console.log(`OTP Send: SMS sent successfully to ${phoneNumber}. Message ID: ${vonageResult.messages[0]['message-id']}`);
      
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
