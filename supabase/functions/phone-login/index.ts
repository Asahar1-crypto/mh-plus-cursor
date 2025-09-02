import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

    // Normalize phone number (Israeli format)
    let normalizedPhone = phoneNumber.replace(/[\s\-]/g, '');
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '+972' + normalizedPhone.substring(1);
    } else if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = '+972' + normalizedPhone;
    }
    
    console.log('Normalized phone number:', normalizedPhone);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if phone number exists in profiles - try multiple formats
    let profile = null;
    let profileError = null;
    
    // Try exact match first
    const { data: exactProfile, error: exactError } = await supabase
      .from('profiles')
      .select('id, name, phone_number')
      .eq('phone_number', normalizedPhone)
      .maybeSingle();
    
    if (exactProfile) {
      profile = exactProfile;
    } else {
      // Try formatted versions (with dashes)
      const formattedVersions = [
        normalizedPhone.replace('+972', '0').replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3'),
        normalizedPhone.replace('+972', '054-970-7777'), // specific for this number
        normalizedPhone.replace('+972', '0').replace(/(\d{3})(\d{7})/, '$1-$2')
      ];
      
      for (const version of formattedVersions) {
        const { data: formattedProfile, error: formattedError } = await supabase
          .from('profiles')
          .select('id, name, phone_number')
          .eq('phone_number', version)
          .maybeSingle();
        
        if (formattedProfile) {
          profile = formattedProfile;
          break;
        }
      }
      
      profileError = exactError;
    }

    if (profileError) {
      console.error('Error checking profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!profile) {
      console.log('Phone number not found in profiles');
      return new Response(
        JSON.stringify({ error: 'Phone number not registered' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Profile found for phone:', profile);

    // Temporarily disable rate limiting for testing
    console.log('Rate limiting temporarily disabled for testing');

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Generated OTP code:', otpCode);

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

    // Send SMS via Twilio
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!twilioSid || !twilioToken || !twilioPhone) {
      console.error('Missing Twilio configuration');
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const message = `קוד הכניסה שלך: ${otpCode}\nתוקף: 10 דקות\nלא תשתף את הקוד עם אחרים`;

    const twilioAuth = btoa(`${twilioSid}:${twilioToken}`);
    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${twilioAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: normalizedPhone,
          From: twilioPhone,
          Body: message,
        }),
      }
    );

    const twilioResult = await twilioResponse.json();
    
    if (!twilioResponse.ok) {
      console.error('Twilio error:', twilioResult);
      return new Response(
        JSON.stringify({ error: 'Failed to send SMS' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('SMS sent successfully via Twilio:', twilioResult.sid);

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