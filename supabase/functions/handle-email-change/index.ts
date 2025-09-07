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
    const url = new URL(req.url)
    const token = url.searchParams.get('token')
    const email = url.searchParams.get('email')
    const type = url.searchParams.get('type')

    if (!token || !email || type !== 'email_change') {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify the email change using admin API
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      token,
      { email_confirm: true }
    )

    if (error) {
      console.error('Email verification error:', error)
      
      // Redirect to frontend with error
      return Response.redirect(
        `${Deno.env.get('FRONTEND_URL') || 'https://mhplus.online'}/dashboard?email_change=error&message=${encodeURIComponent(error.message)}`,
        302
      )
    }

    // Update the email change request status
    await supabaseAdmin
      .from('email_change_requests')
      .update({ 
        status: 'completed',
        confirmed_at: new Date().toISOString()
      })
      .eq('token', token)

    // Redirect to frontend with success
    return Response.redirect(
      `${Deno.env.get('FRONTEND_URL') || 'https://mhplus.online'}/dashboard?email_change=success`,
      302
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})