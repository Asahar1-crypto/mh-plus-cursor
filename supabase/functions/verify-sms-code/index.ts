import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { parsePhoneNumber } from 'https://esm.sh/libphonenumber-js@1.10.51'
import { hashOtpCode } from '../_shared/otp-utils.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phoneNumber, code, verificationType = 'registration' } = await req.json()

    console.log('Verification request received:', { verificationType })
    
    if (!phoneNumber || !code) {
      console.error('Missing required fields:', { phoneNumber: !!phoneNumber, code: !!code })
      return new Response(
        JSON.stringify({ 
          verified: false,
          error: 'Phone number and code are required'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    if (!['registration', 'login', 'family_registration'].includes(verificationType)) {
      console.error('Invalid verification type:', verificationType)
      return new Response(
        JSON.stringify({ 
          verified: false,
          error: 'Invalid verification type'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Normalize phone number using libphonenumber-js (same logic as send-sms)
    let normalizedPhone;
    try {
      // Pre-clean: handle common patterns
      let cleaned = phoneNumber.trim()
        .replace(/^\s*00/, '+')           // 00972 -> +972
        .replace(/[^\d+]/g, '');         // Remove all non-digits except +

      // phone cleaned

      // Handle Israeli local format (starting with 0)
      if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
        cleaned = '+972' + cleaned.substring(1);
      }
      
      // Handle Israeli international without + (starting with 972)
      if (cleaned.startsWith('972') && !cleaned.startsWith('+')) {
        cleaned = '+' + cleaned;
      }

      // Parse with libphonenumber-js
      const phoneNumberObj = parsePhoneNumber(cleaned, 'IL');
      
      if (!phoneNumberObj || !phoneNumberObj.isValid()) {
        throw new Error('Invalid phone number format');
      }

      normalizedPhone = phoneNumberObj.number; // Returns E.164 format
    } catch (error) {
      console.error('Phone normalization error:', error);
      return new Response(
        JSON.stringify({ 
          verified: false,
          error: 'Invalid phone number format'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      );
    }
    
    // Phone normalized successfully

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Searching for verification code...')

    // 1. Find the latest active (non-verified, non-expired) code for this phone + type
    //    without filtering by code value yet – so we can track failed attempts.
    const { data: activeCode, error: activeError } = await supabase
      .from('sms_verification_codes')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .eq('verification_type', verificationType)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (activeError) {
      console.error('Database fetch error:', activeError)
      return new Response(
        JSON.stringify({ verified: false, error: 'Database error: ' + activeError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    if (!activeCode) {
      console.error('No active code found for:', { normalizedPhone, verificationType })
      return new Response(
        JSON.stringify({ verified: false, error: 'Invalid or expired verification code' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    // 2. Brute-force protection: block after 5 failed attempts
    const currentAttempts = activeCode.attempts ?? 0
    if (currentAttempts >= 5) {
      console.warn(`Brute-force block: phone=${normalizedPhone}, attempts=${currentAttempts}`)
      return new Response(
        JSON.stringify({ verified: false, error: 'יותר מדי ניסיונות שגויים. אנא בקש קוד חדש.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 },
      )
    }

    // 3. Verify code value – on mismatch, atomically increment attempts and reject.
    //    Using RPC (`UPDATE ... SET attempts = attempts + 1 RETURNING attempts`)
    //    prevents two concurrent wrong-code submissions from racing the counter.
    //    The stored value is an HMAC hash, so we hash the submitted code first.
    const submittedHash = await hashOtpCode(code, normalizedPhone)
    if (activeCode.code !== submittedHash) {
      const { data: newAttempts } = await supabase.rpc('increment_otp_attempts', {
        p_id: activeCode.id,
      })
      const remaining = Math.max(0, 5 - (newAttempts ?? currentAttempts + 1))
      console.warn(`Wrong code for ${normalizedPhone}. Attempts=${newAttempts ?? '?'}/5`)
      return new Response(
        JSON.stringify({ verified: false, error: `קוד שגוי. נותרו ${remaining} ניסיונות.` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    // Code is correct – alias to verificationData for the rest of the function
    const verificationData = activeCode

    // Mark as verified
    const { error: updateError } = await supabase
      .from('sms_verification_codes')
      .update({ 
        verified: true, 
        verified_at: new Date().toISOString() 
      })
      .eq('id', verificationData.id)

    if (updateError) {
      console.error('Error updating verification:', updateError)
      throw new Error('Failed to update verification status')
    }

    // Update user profile with verified phone number for registration verifications
    if (verificationType === 'registration' && verificationData.user_id) {
      console.log('Updating profile with verified phone for user:', verificationData.user_id);

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          phone_number: normalizedPhone,
          phone_e164: normalizedPhone,
          phone_verified: true,
          raw_phone_input: phoneNumber // Store original input format too
        })
        .eq('id', verificationData.user_id);

      if (profileError) {
        console.error('Error updating profile with phone:', profileError);
        // Don't fail the verification if profile update fails
      } else {
        console.log('Profile updated with verified phone number');
      }
    }

    // For login verification: ensure phone_verified is true (idempotent)
    if (verificationType === 'login' && verificationData.user_id) {
      await supabase
        .from('profiles')
        .update({ phone_verified: true })
        .eq('id', verificationData.user_id);
    }

    console.log('SMS verification successful')

    // If this is a login verification, return a single-use token_hash so the
    // client can call supabase.auth.verifyOtp({ token_hash, type:'magiclink' })
    // and let supabase-js create the session natively (atomic, lock-safe).
    if (verificationType === 'login' && verificationData.user_id) {
      const { data: authUser, error: authError } = await supabase.auth.admin
        .getUserById(verificationData.user_id);

      if (authError || !authUser.user?.email) {
        console.error('Error getting auth user or missing email:', authError);
        return new Response(
          JSON.stringify({ verified: false, error: 'User authentication failed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
        );
      }

      const { data: linkData, error: linkError } = await supabase.auth.admin
        .generateLink({ type: 'magiclink', email: authUser.user.email });

      if (linkError || !linkData?.properties?.hashed_token) {
        console.error('Error generating magic link token:', linkError);
        return new Response(
          JSON.stringify({ verified: false, error: 'Failed to create session' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
        );
      }

      console.log('Magic-link token_hash issued for user:', authUser.user.id);

      return new Response(
        JSON.stringify({
          verified: true,
          message: 'Phone number verified successfully',
          verificationType,
          token_hash: linkData.properties.hashed_token,
          email: authUser.user.email,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    // For non-login verifications, return standard response
    return new Response(
      JSON.stringify({
        verified: true,
        message: 'Phone number verified successfully',
        verificationType
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error verifying SMS code:', error)
    return new Response(
      JSON.stringify({ 
        verified: false,
        error: error.message || 'Failed to verify SMS code'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})