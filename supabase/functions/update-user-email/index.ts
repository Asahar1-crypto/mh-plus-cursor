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
    const { userId, newEmail, token } = await req.json()

    if (!userId || !newEmail || !token) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, newEmail, token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify the token is valid and not expired
    const { data: changeRequest, error: tokenError } = await supabaseAdmin
      .from('email_change_requests')
      .select('*')
      .eq('token', token)
      .eq('user_id', userId)
      .eq('new_email', newEmail)
      .eq('status', 'pending')
      .single()

    if (tokenError || !changeRequest) {
      console.error('Invalid token:', tokenError)
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if token has expired
    const expiresAt = new Date(changeRequest.expires_at)
    if (expiresAt < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Token has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update user email using admin API
    const { data: userData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { 
        email: newEmail,
        email_confirm: true // Mark email as confirmed
      }
    )

    if (updateError) {
      console.error('Email update error:', updateError)
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Email updated successfully for user:', userId, 'to:', newEmail)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email updated successfully',
        user: userData.user
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