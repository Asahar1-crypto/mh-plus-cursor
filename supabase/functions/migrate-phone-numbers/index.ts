import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { parsePhoneNumber } from 'https://esm.sh/libphonenumber-js@1.10.51';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Phone number normalization function (same as other functions)
function normalizePhoneNumber(phone: string): { success: boolean; e164?: string; type?: string; error?: string } {
  try {
    if (!phone || phone.trim() === '') {
      return { success: false, error: 'Empty phone number' };
    }

    // Pre-clean: handle common patterns
    let cleaned = phone.trim()
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

    // Handle special numbers (emergency, service numbers)
    const cleanedDigits = cleaned.replace(/[^\d]/g, '');
    const specialPatterns = [
      /^1\d{2,3}$/,        // 100, 101, 102, etc.
      /^1700\d{6}$/,       // 1-700 numbers
      /^1800\d{6}$/,       // 1-800 numbers
      /^120\d?$/,          // 120, 1201, etc.
      /^144$/,             // 144
      /^199$/              // 199
    ];

    if (specialPatterns.some(pattern => pattern.test(cleanedDigits))) {
      return { 
        success: true, 
        e164: phone, // Keep original for special numbers
        type: 'special' 
      };
    }

    // Parse with libphonenumber-js
    const phoneNumber = parsePhoneNumber(cleaned, 'IL');
    
    if (!phoneNumber || !phoneNumber.isValid()) {
      return { success: false, error: 'Invalid phone number format' };
    }

    // Determine phone type
    const national = phoneNumber.nationalNumber;
    let type = null;
    
    if (national.length === 9) {
      const prefix = national.substring(0, 2);
      if (['50', '52', '53', '54', '55', '56', '57', '58'].includes(prefix)) {
        type = 'mobile';
      } else if (['72', '73', '74', '75', '76', '77', '78', '79'].includes(prefix)) {
        type = 'voip';
      }
    } else if (national.length === 8) {
      const prefix = national.substring(0, 1);
      if (['2', '3', '4', '8', '9'].includes(prefix)) {
        type = 'fixed';
      }
    }

    return { 
      success: true, 
      e164: phoneNumber.number,
      type: type || 'mobile' // Default to mobile if can't determine
    };
  } catch (error) {
    console.error('Phone normalization error:', error);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Phone migration function called');

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all profiles that have phone_number but no phone_e164
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, phone_number, phone_e164')
      .not('phone_number', 'is', null)
      .is('phone_e164', null);

    if (fetchError) {
      console.error('Error fetching profiles:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profiles' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Found ${profiles?.length || 0} profiles to migrate`);

    const results = {
      total: profiles?.length || 0,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No profiles need migration',
          results 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Process each profile
    for (const profile of profiles) {
      try {
        console.log(`Processing profile ${profile.id} with phone: ${profile.phone_number}`);
        
        const normalizationResult = normalizePhoneNumber(profile.phone_number);
        
        if (normalizationResult.success) {
          // Update the profile with normalized data
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              phone_e164: normalizationResult.e164,
              phone_type: normalizationResult.type,
              raw_phone_input: profile.phone_number
            })
            .eq('id', profile.id);

          if (updateError) {
            console.error(`Error updating profile ${profile.id}:`, updateError);
            results.failed++;
            results.errors.push(`Profile ${profile.id}: ${updateError.message}`);
          } else {
            console.log(`Successfully migrated profile ${profile.id}: ${profile.phone_number} -> ${normalizationResult.e164}`);
            results.successful++;
          }
        } else {
          console.error(`Failed to normalize phone for profile ${profile.id}: ${normalizationResult.error}`);
          results.failed++;
          results.errors.push(`Profile ${profile.id}: ${normalizationResult.error}`);
        }
      } catch (error) {
        console.error(`Unexpected error processing profile ${profile.id}:`, error);
        results.failed++;
        results.errors.push(`Profile ${profile.id}: ${error.message}`);
      }
    }

    console.log('Migration completed:', results);

    return new Response(
      JSON.stringify({ 
        message: 'Migration completed',
        results 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in phone migration function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});