import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifySMSRequest {
  phone_number: string;
  code: string;
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

    const { phone_number, code, purpose }: VerifySMSRequest = await req.json();

    if (!phone_number || !code) {
      return new Response(
        JSON.stringify({ error: 'Phone number and code are required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Find the verification code
    const { data: verificationData, error: fetchError } = await supabaseClient
      .from('sms_verification_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('phone_number', phone_number)
      .eq('code', code)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !verificationData) {
      // Check if it's due to too many attempts
      const { data: codeData } = await supabaseClient
        .from('sms_verification_codes')
        .select('attempts')
        .eq('user_id', user.id)
        .eq('phone_number', phone_number)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (codeData && codeData.attempts >= 3) {
        return new Response(
          JSON.stringify({ 
            error: 'חרגת ממספר הניסיונות המותר. בקש קוד חדש.',
            code: 'TOO_MANY_ATTEMPTS'
          }),
          { 
            status: 429,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          }
        );
      }

      // Increment attempts
      await supabaseClient
        .from('sms_verification_codes')
        .update({ attempts: (codeData?.attempts || 0) + 1 })
        .eq('user_id', user.id)
        .eq('phone_number', phone_number)
        .order('created_at', { ascending: false })
        .limit(1);

      return new Response(
        JSON.stringify({ 
          error: 'קוד אימות שגוי או פג תוקפו',
          code: 'INVALID_CODE'
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Mark the code as verified
    const { error: updateError } = await supabaseClient
      .from('sms_verification_codes')
      .update({ 
        verified: true, 
        verified_at: new Date().toISOString()
      })
      .eq('id', verificationData.id);

    if (updateError) {
      console.error('Failed to mark code as verified:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify code' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Update user profile if this is phone verification
    if (purpose === 'verification') {
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({ 
          phone_number: phone_number,
          phone_verified: true
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Failed to update profile:', profileError);
      }
    }

    // Clean up old verification codes for this user and phone
    await supabaseClient
      .from('sms_verification_codes')
      .delete()
      .eq('user_id', user.id)
      .eq('phone_number', phone_number)
      .neq('id', verificationData.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'המספר אומת בהצלחה',
        verified: true
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('Error in verify-sms function:', error);
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