import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const { phoneNumber, code } = await req.json()
    
    console.log('Verification request received:', { phoneNumber, code })
    
    if (!phoneNumber || !code) {
      throw new Error('Phone number and code are required')
    }

    // Normalize phone number for Israel (same logic as send-sms)
    let normalizedPhone = phoneNumber.replace(/[\s-]/g, '') // Remove spaces and dashes
    console.log('Phone after removing spaces/dashes:', normalizedPhone)
    
    // Add country code if not present
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '+972' + normalizedPhone.substring(1)
    } else if (normalizedPhone.startsWith('972')) {
      normalizedPhone = '+' + normalizedPhone
    } else if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = '+972' + normalizedPhone
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
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()  // Use maybeSingle instead of single

    console.log('Database query result:', { verificationData, fetchError })

    if (fetchError || !verificationData) {
      console.error('Verification code not found or expired:', fetchError)
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

    console.log('SMS verification successful for phone:', phoneNumber)

    return new Response(
      JSON.stringify({ 
        verified: true,
        message: 'Phone number verified successfully'
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