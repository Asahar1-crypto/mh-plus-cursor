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
    const { phoneNumber, type, message } = await req.json()
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get Twilio credentials
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error('Missing Twilio configuration')
    }

    let smsMessage = message
    let verificationCode: string | null = null

    // Handle verification SMS
    if (type === 'verification') {
      // Generate 6-digit verification code
      verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
      smsMessage = `קוד האימות שלך במחציות פלוס: ${verificationCode}`

      // Get current user (if authenticated)
      const authHeader = req.headers.get('Authorization')
      let userId = null
      
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error } = await supabase.auth.getUser(token)
        if (!error && user) {
          userId = user.id
        }
      }

      // Store verification code in database
      const { error: dbError } = await supabase
        .from('sms_verification_codes')
        .insert({
          user_id: userId,
          phone_number: phoneNumber,
          code: verificationCode,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
        })

      if (dbError) {
        console.error('Error storing verification code:', dbError)
        throw new Error('Failed to store verification code')
      }
    }

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
        To: phoneNumber,
        From: twilioPhoneNumber,
        Body: smsMessage,
      }),
    })

    if (!twilioResponse.ok) {
      const errorData = await twilioResponse.text()
      console.error('Twilio error:', errorData)
      throw new Error(`Twilio error: ${twilioResponse.status}`)
    }

    const twilioData = await twilioResponse.json()
    console.log('SMS sent successfully:', twilioData.sid)

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSid: twilioData.sid,
        ...(verificationCode && { verificationCode }) // Include code in response for testing
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error sending SMS:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to send SMS'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})