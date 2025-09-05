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
    const { phoneNumber, code, type } = await req.json();
    
    console.log(`OTP Verify: Request for ${phoneNumber}, type: ${type}, code: ${code}`);

    if (!phoneNumber || !code || !type) {
      return new Response(
        JSON.stringify({ error: 'Phone number, code, and type are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate code format
    if (!/^\d{6}$/.test(code)) {
      return new Response(
        JSON.stringify({ error: 'Invalid code format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the verification code
    const { data: verificationRecord, error: fetchError } = await supabase
      .from('sms_verification_codes')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('code', code)
      .eq('verification_type', type)
      .eq('verified', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !verificationRecord) {
      console.log(`OTP Verify: Code not found or expired for ${phoneNumber}`);
      return new Response(
        JSON.stringify({ 
          verified: false,
          error: 'קוד אימות שגוי או פג תוקף' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Mark as verified
    const { error: updateError } = await supabase
      .from('sms_verification_codes')
      .update({ 
        verified: true, 
        verified_at: new Date().toISOString() 
      })
      .eq('id', verificationRecord.id);

    if (updateError) {
      console.error('Error updating verification status:', updateError);
      return new Response(
        JSON.stringify({ 
          verified: false,
          error: 'שגיאה באימות הקוד' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`OTP Verify: Code verified successfully for ${phoneNumber}`);

    // For login type, generate magic link
    let magicLink = undefined;
    if (type === 'login') {
      try {
        // Find user by phone number
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone_e164', phoneNumber)
          .single();

        if (profile) {
          const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: profile.id, // This might need to be email instead
            options: {
              redirectTo: `${supabaseUrl.replace('supabase.co', 'vercel.app')}/dashboard`
            }
          });

          if (!linkError && linkData?.properties?.action_link) {
            magicLink = linkData.properties.action_link;
          }
        }
      } catch (error) {
        console.error('Error generating magic link:', error);
        // Continue without magic link
      }
    }

    return new Response(
      JSON.stringify({ 
        verified: true,
        success: true,
        message: 'הקוד אומת בהצלחה',
        magicLink,
        userId: verificationRecord.user_id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('OTP Verify function error:', error);
    return new Response(
      JSON.stringify({ 
        verified: false,
        error: 'שגיאה פנימית בשרת' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});