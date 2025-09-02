import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendSMSRequest {
  phone_number: string;
  purpose: 'verification' | '2fa' | 'login';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
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

    const { phone_number, purpose }: SendSMSRequest = await req.json();

    if (!phone_number) {
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Save the verification code to the database
    const { error: dbError } = await supabaseClient
      .from('sms_verification_codes')
      .insert({
        user_id: user.id,
        phone_number: phone_number,
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

    // SendGrid doesn't have native SMS API, but we can use their email-to-SMS feature
    // or integrate with their partner Twilio. For now, let's use a simple HTTP approach
    // Note: You'll need to configure SendGrid for SMS or use their Twilio integration
    
    const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY');
    if (!sendGridApiKey) {
      console.error('SendGrid API key not found');
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // For demo purposes, we'll simulate SMS sending
    // In production, you'd integrate with SendGrid's SMS service or Twilio
    console.log(`SMS Code for ${phone_number}: ${verificationCode}`);
    
    // Simulate sending SMS via HTTP request
    // Replace this with actual SendGrid SMS API call
    const smsMessage = purpose === '2fa' 
      ? `קוד האימות שלך הוא: ${verificationCode}. הקוד תקף למשך 10 דקות.`
      : `קוד האימות למספר הטלפון שלך הוא: ${verificationCode}. הקוד תקף למשך 10 דקות.`;

    // Log the SMS for demo purposes (in production, send actual SMS)
    console.log(`Sending SMS to ${phone_number}: ${smsMessage}`);

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