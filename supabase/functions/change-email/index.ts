import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { v4 as uuidv4 } from "https://deno.land/std@0.177.0/uuid/mod.ts"

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

    // Generate a verification token
    const verificationToken = uuidv4()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Store the email change request with verification token
    const { error: insertError } = await supabaseAdmin
      .from('email_change_requests')
      .insert({
        user_id: userId,
        old_email: oldEmail,
        new_email: newEmail,
        status: 'pending',
        token: verificationToken,
        expires_at: expiresAt.toISOString()
      })

    if (insertError) {
      console.error('Error storing email change request:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to store email change request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send verification email using the send-email function
    const verificationLink = `${Deno.env.get('FRONTEND_URL') || 'https://mhplus.online'}/verify-email-change?token=${verificationToken}&email=${encodeURIComponent(newEmail)}`
    
    const emailHtml = `
      <div style="direction: rtl; text-align: right; font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">אימות שינוי כתובת מייל</h2>
        <p>שלום,</p>
        <p>קיבלנו בקשה לשינוי כתובת המייל שלך מ-<strong>${oldEmail}</strong> ל-<strong>${newEmail}</strong>.</p>
        <p>כדי להשלים את התהליך, יש ללחוץ על הלינק הבא:</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${verificationLink}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            אישור שינוי מייל
          </a>
        </div>
        <p><strong>חשוב:</strong> קישור זה תקף ל-24 שעות בלבד.</p>
        <p>אם לא ביקשת לשנות את כתובת המייל, אנא התעלם מהודעה זו.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          מחציות פלוס - ניהול הוצאות משפחתיות
        </p>
      </div>
    `

    try {
      // Call the send-email function
      const emailResponse = await supabaseAdmin.functions.invoke('send-email', {
        body: {
          to: newEmail,
          subject: 'אימות שינוי כתובת מייל - מחציות פלוס',
          html: emailHtml
        }
      })

      if (emailResponse.error) {
        console.error('Error sending verification email:', emailResponse.error)
        // Don't fail the request if email sending fails
      }

      console.log('Email change request created successfully with token:', verificationToken)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'נשלח מייל אימות לכתובת המייל החדשה. אנא בדוק את תיבת הדואר שלך.',
          token: verificationToken
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'בקשת שינוי המייל נוצרה, אך לא ניתן לשלוח מייל אימות. אנא פנה לתמיכה.',
          token: verificationToken
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})