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
    const { email, code, type } = await req.json();

    console.log(`Email OTP Verify: Request for ${email}, type: ${type}`);

    if (!email || !code || !type) {
      return new Response(
        JSON.stringify({ error: 'Email, code, and type are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate code format
    if (!/^\d{6}$/.test(code)) {
      return new Response(
        JSON.stringify({ error: 'Invalid code format' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate type
    const validTypes = ['login', 'registration', 'reset', 'email_verification'];
    if (!validTypes.includes(type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid verification type' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Find the latest active (non-verified, non-expired) code for this email + type
    const { data: activeCode, error: activeError } = await supabaseAdmin
      .from('sms_verification_codes')
      .select('*')
      .eq('phone_number', normalizedEmail)
      .eq('verification_type', type)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeError) {
      console.error('Database fetch error:', activeError);
      return new Response(
        JSON.stringify({ verified: false, error: 'Database error: ' + activeError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!activeCode) {
      console.log(`Email OTP Verify: No active code found for ${normalizedEmail}`);
      return new Response(
        JSON.stringify({
          verified: false,
          error: 'קוד שגוי או שפג תוקפו',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Brute-force protection: block after 5 failed attempts
    const currentAttempts = activeCode.attempts ?? 0;
    if (currentAttempts >= 5) {
      console.warn(`Email OTP Verify: Brute-force block for ${normalizedEmail}, attempts=${currentAttempts}`);
      return new Response(
        JSON.stringify({
          verified: false,
          error: 'יותר מדי ניסיונות שגויים. אנא בקש קוד חדש.',
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify code value – on mismatch, atomically increment attempts and reject.
    // The stored value is an HMAC hash, so hash the submitted code first.
    const submittedHash = await hashOtpCode(code, normalizedEmail);
    if (activeCode.code !== submittedHash) {
      const { data: newAttempts } = await supabaseAdmin.rpc('increment_otp_attempts', {
        p_id: activeCode.id,
      });

      const remaining = Math.max(0, 5 - (newAttempts ?? currentAttempts + 1));
      console.warn(`Email OTP Verify: Wrong code for ${normalizedEmail}. Attempts=${newAttempts ?? '?'}/5`);
      return new Response(
        JSON.stringify({
          verified: false,
          error: `קוד שגוי. נותרו ${remaining} ניסיונות.`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Code is correct - mark as verified
    const { error: updateError } = await supabaseAdmin
      .from('sms_verification_codes')
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', activeCode.id);

    if (updateError) {
      console.error('Error updating verification status:', updateError);
      return new Response(
        JSON.stringify({ verified: false, error: 'שגיאה באימות הקוד' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Email OTP Verify: Code verified successfully for ${normalizedEmail}, type: ${type}`);

    // Handle based on type
    if (type === 'registration') {
      // For registration, just confirm verification - registration handled separately
      return new Response(
        JSON.stringify({
          success: true,
          verified: true,
          message: 'כתובת המייל אומתה בהצלחה',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (type === 'login' || type === 'email_verification') {
      // Generate magic-link token_hash; linkData.user gives us the id for the
      // profile update (the profiles table has no `email` column, only `id`).
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: normalizedEmail,
      });

      if (linkError || !linkData?.properties?.hashed_token) {
        console.error('Error generating magic link:', linkError);
        return new Response(
          JSON.stringify({
            verified: true,
            error: 'אימות הצליח אך נכשל ביצירת הפעלה. אנא נסה להתחבר שוב.',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mark email verified at both the Supabase auth level and the profile mirror.
      if (linkData.user?.id) {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ email_verified: true })
          .eq('id', linkData.user.id);
        if (profileError) {
          console.error('Error updating email_verified on profile:', profileError);
        }
        // Idempotent: confirms email at the auth.users level so RLS/JWT claims reflect it.
        await supabaseAdmin.auth.admin.updateUserById(linkData.user.id, { email_confirm: true });
      }

      return new Response(
        JSON.stringify({
          success: true,
          verified: true,
          token_hash: linkData.properties.hashed_token,
          email: normalizedEmail,
          message: 'התחברות בוצעה בהצלחה',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (type === 'reset') {
      // Recovery token_hash — client calls verifyOtp({ type:'recovery', token_hash })
      // to obtain a recovery session that can call supabase.auth.updateUser({password}).
      const { data: recoveryData, error: recoveryError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: normalizedEmail,
      });

      if (recoveryError || !recoveryData?.properties?.hashed_token) {
        console.error('Error generating recovery link:', recoveryError);
        return new Response(
          JSON.stringify({
            verified: true,
            error: 'אימות הצליח אך נכשל ביצירת קישור איפוס. אנא נסה שוב.',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          verified: true,
          token_hash: recoveryData.properties.hashed_token,
          email: normalizedEmail,
          message: 'ניתן כעת לאפס את הסיסמה',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Should not reach here, but return a generic success
    return new Response(
      JSON.stringify({ success: true, verified: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Email OTP Verify function error:', error);
    return new Response(
      JSON.stringify({
        verified: false,
        error: 'שגיאה פנימית בשרת',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
