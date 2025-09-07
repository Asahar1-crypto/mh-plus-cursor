import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { oldEmail, newEmail, userId } = await req.json()

    if (!oldEmail || !newEmail || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: oldEmail, newEmail, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Log the email change request
    const { error: logError } = await supabaseAdmin
      .from('email_change_requests')
      .insert({
        user_id: userId,
        old_email: oldEmail,
        new_email: newEmail,
        status: 'pending'
      })

    if (logError) {
      console.error('Error logging email change request:', logError)
    }

    // Update user email using admin API with custom redirect URL
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { 
        email: newEmail,
        email_confirm: false // This will send the confirmation email
      }
    )

    if (error) {
      console.error('Email change error:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Email change initiated successfully:', data)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email change initiated. Check your new email for confirmation link.',
        data 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})