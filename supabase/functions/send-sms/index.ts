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
    console.log('SMS Function called with body:', await req.clone().text())
    const { phoneNumber, type, message } = await req.json()
    
    console.log('Parsed request:', { phoneNumber, type, message })
    
    if (!phoneNumber) {
      throw new Error('Phone number is required')
    }
    
    // Normalize phone number using libphonenumber-js
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
      throw new Error('Invalid phone number format');
    }
    
    console.log('Normalized phone number:', normalizedPhone)
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Supabase client initialized')

    // Get Twilio credentials
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

    console.log('Twilio config check:', {
      hasSid: !!twilioAccountSid,
      hasToken: !!twilioAuthToken,
      hasPhone: !!twilioPhoneNumber,
      phoneNumber: twilioPhoneNumber
    })

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.error('Missing Twilio configuration:', {
        twilioAccountSid: !!twilioAccountSid,
        twilioAuthToken: !!twilioAuthToken,
        twilioPhoneNumber: !!twilioPhoneNumber
      })
      throw new Error('Missing Twilio configuration')
    }

    let smsMessage = message
    let verificationCode: string | null = null

    // Handle verification SMS
    if (type === 'verification') {
      console.log('Generating verification code for phone:', normalizedPhone)
      
      // Generate 6-digit verification code
      verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
      smsMessage = `קוד האימות שלך במחציות פלוס: ${verificationCode}`

      console.log('Generated verification code:', verificationCode)

      // Get current user (if authenticated)
      const authHeader = req.headers.get('Authorization')
      let userId = null
      
      console.log('Auth header present:', !!authHeader)
      
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error } = await supabase.auth.getUser(token)
        if (!error && user) {
          userId = user.id
          console.log('User authenticated:', userId)
        } else {
          console.log('User authentication failed:', error)
        }
      } else {
        console.log('No auth header - registration flow')
      }

      console.log('Storing verification code in database...')
      
      // Store verification code in database
      const { error: dbError } = await supabase
        .from('sms_verification_codes')
        .insert({
          user_id: userId,
          phone_number: normalizedPhone,
          code: verificationCode,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
        })

      if (dbError) {
        console.error('Error storing verification code:', dbError)
        throw new Error('Failed to store verification code')
      }
      
      console.log('Verification code stored successfully')
    }

    console.log('Preparing to send SMS via Twilio...')
    console.log('SMS details:', {
      to: normalizedPhone,
      from: twilioPhoneNumber,
      messageLength: smsMessage.length
    })
    
    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`)

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: normalizedPhone,
        From: twilioPhoneNumber,
        Body: smsMessage,
      }),
    })

    console.log('Twilio response status:', twilioResponse.status)

    if (!twilioResponse.ok) {
      const errorData = await twilioResponse.text()
      console.error('Twilio error response:', errorData)
      throw new Error(`Twilio error: ${twilioResponse.status} - ${errorData}`)
    }

    const twilioData = await twilioResponse.json()
    console.log('SMS sent successfully:', twilioData.sid)

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSid: twilioData.sid,
        phoneNumber: normalizedPhone,
        ...(verificationCode && { verificationCode }) // Include code in response for testing
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in SMS function:', error)
    console.error('Error stack:', error.stack)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to send SMS',
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})