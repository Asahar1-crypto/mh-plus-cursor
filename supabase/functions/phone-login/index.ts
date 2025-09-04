import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { parsePhoneNumber } from 'https://esm.sh/libphonenumber-js@1.10.51';

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

    // Normalize phone number using libphonenumber-js
    let normalizedPhone;
    try {
      // Pre-clean: handle common patterns
      let cleaned = phoneNumber.trim()
        .replace(/^\s*00/, '+')           // 00972 -> +972
        .replace(/[^\d+]/g, '');         // Remove all non-digits except +

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
        JSON.stringify({ error: 'Invalid phone number format' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log('Normalized phone number:', normalizedPhone);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if phone number exists in profiles using phone_number field
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, phone_number')
      .eq('phone_number', normalizedPhone)
      .maybeSingle();

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

    let userProfile = profile;
    
    if (!profile) {
      console.log('Phone number not found in profiles - checking auth.users');
      
      // First check if user exists in auth.users with this phone number
      const { data: existingUser, error: userCheckError } = await supabase.auth.admin.listUsers();
      
      let authUser = null;
      if (existingUser?.users) {
        authUser = existingUser.users.find(user => user.phone === normalizedPhone);
      }
      
      if (authUser) {
        console.log('User exists in auth.users but not in profiles, creating profile');
        userProfile = {
          id: authUser.id,
          name: `משתמש ${normalizedPhone.slice(-4)}`,
          phone_number: normalizedPhone
        };
        
        // Create missing profile
        const { data: newProfile, error: profileCreateError } = await supabase
          .from('profiles')
          .insert({
            id: authUser.id,
            phone_number: normalizedPhone,
            name: `משתמש ${normalizedPhone.slice(-4)}`
          })
          .select('id, name, phone_number')
          .single();

        if (profileCreateError) {
          console.error('Error creating missing profile:', profileCreateError);
          // Continue anyway with the user data we have
        } else {
          userProfile = newProfile;
        }
      } else {
        console.log('Creating completely new user');
        
        // Create a new user in auth.users with phone number
        const { data: newAuthUser, error: authError } = await supabase.auth.admin.createUser({
          phone: normalizedPhone,
          phone_confirmed: false,
          email_confirmed: false,
          email: `phone_${normalizedPhone.replace(/[^0-9]/g, '')}@temp-phone.local` // Unique temp email
        });

        if (authError || !newAuthUser.user) {
          console.error('Error creating auth user:', authError?.message || 'Unknown error');
          console.log('Full error details:', authError);
          return new Response(
            JSON.stringify({ error: 'Failed to create user account: ' + (authError?.message || 'Database error creating new user') }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        console.log('Auth user created successfully:', newAuthUser.user.id);

        // Check if profile was created automatically by trigger
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for trigger to complete
        
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, name, phone_number')
          .eq('id', newAuthUser.user.id)
          .maybeSingle();

        if (existingProfile) {
          console.log('Profile already exists from trigger:', existingProfile);
          
          // Update the phone number if needed
          const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({ 
              phone_number: normalizedPhone,
              name: existingProfile.name || `משתמש ${normalizedPhone.slice(-4)}`
            })
            .eq('id', newAuthUser.user.id)
            .select('id, name, phone_number')
            .single();

          if (updateError) {
            console.error('Error updating profile:', updateError);
            return new Response(
              JSON.stringify({ error: 'Failed to update user profile' }),
              { 
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
          
          userProfile = updatedProfile;
        } else {
          // Create profile manually if trigger didn't work
          const { data: newProfile, error: profileCreateError } = await supabase
            .from('profiles')
            .insert({
              id: newAuthUser.user.id,
              phone_number: normalizedPhone,
              name: `משתמש ${normalizedPhone.slice(-4)}`
            })
            .select('id, name, phone_number')
            .single();

          if (profileCreateError) {
            console.error('Error creating profile:', profileCreateError);
            return new Response(
              JSON.stringify({ error: 'Failed to create user profile: ' + profileCreateError.message }),
              { 
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }

          userProfile = newProfile;
        }
      }
    }

    console.log('Profile found for phone:', userProfile);

    // Temporarily disable rate limiting for testing
    console.log('Rate limiting temporarily disabled for testing');

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Generated OTP code:', otpCode);

    // Clear any existing unverified codes for this phone and verification type
    const { error: clearError } = await supabase
      .from('sms_verification_codes')
      .delete()
      .eq('phone_number', normalizedPhone)
      .eq('verification_type', 'login')
      .eq('verified', false);

    if (clearError) {
      console.warn('Error clearing old codes (non-fatal):', clearError);
    }

    // Store OTP in database
    const { error: storeError } = await supabase
      .from('sms_verification_codes')
      .insert({
        phone_number: normalizedPhone,
        code: otpCode,
        verification_type: 'login',
        user_id: userProfile.id,
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
        userId: userProfile.id,
        userName: userProfile.name
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