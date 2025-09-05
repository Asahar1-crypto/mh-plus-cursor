import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

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
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.error('Missing Twilio credentials');
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { phoneNumber, code, message, type = 'verification', verificationType = 'registration' } = await req.json();
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

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // If no code provided, find the latest verification code for this phone number
    let verificationCode = code;
    if (!verificationCode && type === 'verification') {
      // First try to find existing valid code
      const { data: codeData } = await supabase
        .from('sms_verification_codes')
        .select('code')
        .eq('phone_number', phoneNumber)
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
            phone_number: phoneNumber,
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

    // Send SMS using Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: phoneNumber,
        From: twilioPhoneNumber,
        Body: smsMessage,
      }),
    });

    const twilioResult = await twilioResponse.json();
    
    if (twilioResponse.ok) {
      console.log(`SMS sent successfully. SID: ${twilioResult.sid}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          messageSid: twilioResult.sid,
          status: twilioResult.status 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      console.error('Twilio error:', twilioResult);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send SMS', 
          details: twilioResult.message 
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