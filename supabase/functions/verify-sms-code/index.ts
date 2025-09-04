import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { parsePhoneNumber } from 'https://esm.sh/libphonenumber-js@1.10.51'

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
    
    console.log('Verification request received:', { phoneNumber, code, verificationType })
    
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

    if (!['registration', 'login'].includes(verificationType)) {
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

      console.log('Phone after initial cleaning:', cleaned)

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
    
    console.log('Normalized phone number for verification:', normalizedPhone)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Searching for verification code...')
    
    // Find valid verification code using normalized phone number
    const { data: verificationData, error: fetchError } = await supabase
      .from('sms_verification_codes')
      .select('*')
      .eq('phone_number', normalizedPhone)  // Use normalized phone number
      .eq('code', code)
      .eq('verification_type', verificationType)  // Filter by verification type
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()  // Use maybeSingle instead of single

    console.log('Database query result:', { verificationData, fetchError })
    console.log('Query parameters used:', {
      normalizedPhone,
      code,
      verificationType,
      currentTime: new Date().toISOString()
    })

    if (fetchError) {
      console.error('Database fetch error:', fetchError)
      return new Response(
        JSON.stringify({ 
          verified: false,
          error: 'Database error: ' + fetchError.message
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    if (!verificationData) {
      console.error('No verification data found for:', { normalizedPhone, code, verificationType })
      return new Response(
        JSON.stringify({ 
          verified: false,
          error: 'Invalid or expired verification code'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

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

    console.log('SMS verification successful for phone:', phoneNumber)

    // If this is a login verification, we need to create a Supabase session
    let sessionData = null;
    if (verificationType === 'login' && verificationData.user_id) {
      console.log('Creating session for login verification...');
      
      // Get user data from auth.users
      const { data: authUser, error: authError } = await supabase.auth.admin
        .getUserById(verificationData.user_id);

      if (authError || !authUser.user) {
        console.error('Error getting auth user:', authError);
        return new Response(
          JSON.stringify({ 
            verified: false,
            error: 'User authentication failed'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          },
        );
      }

      // Generate session tokens for the user
      const { data: sessionResult, error: sessionError } = await supabase.auth.admin
        .generateLink({
          type: 'magiclink',
          email: authUser.user.email!,
          options: {
            redirectTo: `${Deno.env.get('SUPABASE_URL')}/auth/v1/callback?redirect_to=/dashboard`
          }
        });

      if (sessionError) {
        console.error('Error generating session:', sessionError);
      } else {
        sessionData = {
          userId: authUser.user.id,
          email: authUser.user.email,
          sessionUrl: sessionResult.properties?.action_link
        };
        console.log('Session created successfully for user:', authUser.user.id);
      }
    }

    const response = { 
      verified: true,
      message: 'Phone number verified successfully',
      verificationType,
      ...(sessionData && { session: sessionData })
    };

    return new Response(
      JSON.stringify(response),
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