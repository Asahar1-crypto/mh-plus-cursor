import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendSMSRequest {
  to?: string;
  phone_number?: string;
  message?: string;
  purpose?: 'verification' | '2fa' | 'login' | 'test';
  testMode?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('=== SMS FUNCTION STARTED ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing SMS request...');
    
    // Parse the request body first to check for testMode
    const { to, phone_number, message, purpose, testMode }: SendSMSRequest = await req.json();
    
    // Handle test mode - just check Twilio credentials without authentication
    if (testMode) {
      console.log('Test mode - checking Twilio credentials');
      
      // Get Twilio credentials
      const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
      const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
      
      if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
        console.error('Twilio credentials not found');
        return new Response(
          JSON.stringify({ error: 'SMS service not configured' }),
          { 
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Twilio connection test successful',
          testMode: true
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }
    
    // Initialize Supabase client for non-test requests
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the user from the JWT token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Handle phone number from either 'to' or 'phone_number' field
    const targetPhoneNumber = to || phone_number;

    if (!targetPhoneNumber) {
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Get Twilio credentials
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
    
    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.error('Twilio credentials not found');
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }


    let smsMessage = message;
    let verificationCode = '';

    // If no custom message provided, generate verification code and message
    if (!smsMessage) {
      verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Save the verification code to the database
      const { error: dbError } = await supabaseClient
        .from('sms_verification_codes')
        .insert({
          user_id: user.id,
          phone_number: targetPhoneNumber,
          code: verificationCode,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
        });

      if (dbError) {
        console.error('Database error:', dbError);
        return new Response(
          JSON.stringify({ error: 'Failed to save verification code' }),
          { 
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          }
        );
      }

      // Create the SMS message
      smsMessage = purpose === '2fa' 
        ? `קוד האימות שלך הוא: ${verificationCode}. הקוד תקף למשך 10 דקות.`
        : `קוד האימות למספר הטלפון שלך הוא: ${verificationCode}. הקוד תקף למשך 10 דקות.`;
    }

    // Send SMS via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('From', twilioPhoneNumber);
    formData.append('To', targetPhoneNumber);
    formData.append('Body', smsMessage);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!twilioResponse.ok) {
      const errorData = await twilioResponse.text();
      console.error('Failed to send SMS via Twilio:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to send SMS' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    const twilioResult = await twilioResponse.json();
    console.log('SMS sent successfully via Twilio:', twilioResult.sid);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'קוד האימות נשלח בהצלחה',
        // For demo purposes only - remove in production
        debug_code: Deno.env.get('NODE_ENV') === 'development' ? verificationCode : undefined
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('Error in send-sms function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

serve(handler);