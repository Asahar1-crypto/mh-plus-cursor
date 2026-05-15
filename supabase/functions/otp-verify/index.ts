import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { hashOtpCode } from '../_shared/otp-utils.ts';

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

    // 1. Look up the latest active (unverified, unexpired) code for this phone+type.
    //    We deliberately do NOT filter by `code` here — we need the row even when
    //    the submitted code is wrong so we can count failed attempts.
    const { data: activeCode, error: fetchError } = await supabase
      .from('sms_verification_codes')
      .select('id, code, user_id, attempts')
      .eq('phone_number', phoneNumber)
      .eq('verification_type', type)
      .eq('verified', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError || !activeCode) {
      console.log(`OTP Verify: no active code for ${phoneNumber}`);
      return new Response(
        JSON.stringify({ verified: false, error: 'קוד אימות שגוי או פג תוקף' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Brute-force protection: 5 wrong attempts per code, then force a re-send.
    const MAX_ATTEMPTS = 5;
    if ((activeCode.attempts ?? 0) >= MAX_ATTEMPTS) {
      console.warn(`OTP Verify: brute-force lockout for ${phoneNumber} (attempts=${activeCode.attempts})`);
      return new Response(
        JSON.stringify({ verified: false, error: 'יותר מדי ניסיונות שגויים. אנא בקש קוד חדש.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Compare submitted code against stored HMAC hash. On mismatch, atomically
    //    increment the attempt counter (rpc to avoid the read-then-write race).
    const submittedHash = await hashOtpCode(code, phoneNumber);
    if (activeCode.code !== submittedHash) {
      const { data: newAttempts } = await supabase.rpc('increment_otp_attempts', {
        p_id: activeCode.id,
      });
      const remaining = Math.max(0, MAX_ATTEMPTS - (newAttempts ?? (activeCode.attempts ?? 0) + 1));
      console.warn(`OTP Verify: wrong code for ${phoneNumber}, attempts=${newAttempts}`);
      return new Response(
        JSON.stringify({ verified: false, error: `קוד שגוי. נותרו ${remaining} ניסיונות.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const verificationRecord = activeCode;

    // 4. Mark as verified.
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

    // For login type, generate session tokens
    let access_token = undefined;
    let refresh_token = undefined;
    if (type === 'login') {
      try {
        // Find user by phone number
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone_e164', phoneNumber)
          .single();

        if (profile) {
          // Get the user's email from auth.users
          const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
          const userEmail = authUser?.user?.email;

          if (userEmail) {
            const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
              type: 'magiclink',
              email: userEmail,
              options: {
                redirectTo: `${supabaseUrl.replace('supabase.co', 'vercel.app')}/dashboard`
              }
            });

            if (!linkError && linkData?.properties) {
              access_token = linkData.properties.access_token;
              refresh_token = linkData.properties.refresh_token;
            }
          }
        }
      } catch (error) {
        console.error('Error generating session tokens:', error);
        // Continue without tokens
      }
    }

    return new Response(
      JSON.stringify({
        verified: true,
        success: true,
        message: 'הקוד אומת בהצלחה',
        access_token,
        refresh_token,
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