import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate 6-digit OTP code
function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Email templates per type (inlined from docs/email-templates/)
function getEmailHtml(type: string, code: string): { subject: string; html: string } {
  if (type === 'registration') {
    return {
      subject: 'אימות כתובת המייל - מחציות +',
      html: `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0e1a;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0e1a;padding:40px 0;">
<tr><td align="center">
<table width="460" cellpadding="0" cellspacing="0" style="max-width:460px;width:100%;">

  <!-- Header with gradient -->
  <tr><td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:16px 16px 0 0;padding:32px 24px;text-align:center;">
    <img src="https://mhplus.online/logo.png" alt="מחציות +" width="80" height="auto" style="display:block;margin:0 auto 12px auto;border-radius:8px;" />
    <div style="font-size:28px;font-weight:700;color:#ffffff;letter-spacing:1px;">מחציות +</div>
    <div style="font-size:14px;color:rgba(255,255,255,0.8);margin-top:6px;">ניהול הוצאות משפחתי</div>
  </td></tr>

  <!-- Body -->
  <tr><td style="background-color:#141827;padding:36px 32px;text-align:center;">

    <div style="font-size:20px;font-weight:600;color:#e2e8f0;margin-bottom:8px;">אימות כתובת המייל</div>
    <div style="font-size:14px;color:#94a3b8;margin-bottom:28px;">הזן את הקוד הבא כדי לאמת את כתובת המייל שלך</div>

    <!-- OTP Code Box -->
    <div style="background:linear-gradient(135deg,rgba(102,126,234,0.15),rgba(118,75,162,0.15));border:2px solid rgba(102,126,234,0.4);border-radius:12px;padding:24px 16px;margin:0 auto;max-width:280px;">
      <div style="font-size:42px;font-weight:700;color:#ffffff;letter-spacing:14px;font-family:'Courier New',monospace;direction:ltr;">${code}</div>
    </div>

    <div style="font-size:13px;color:#64748b;margin-top:20px;">הקוד תקף ל-10 דקות</div>

    <!-- Welcome message -->
    <div style="background-color:rgba(14,165,233,0.1);border:1px solid rgba(14,165,233,0.2);border-radius:8px;padding:16px;margin-top:24px;">
      <div style="font-size:14px;color:#0EA5E9;">ברוכים הבאים ל-מחציות +!</div>
      <div style="font-size:13px;color:#94a3b8;margin-top:4px;">אחרי האימות תוכלו להתחיל לנהל את ההוצאות המשפחתיות</div>
    </div>

  </td></tr>

  <!-- Footer -->
  <tr><td style="background-color:#0f1320;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;">
    <div style="font-size:12px;color:#475569;line-height:1.6;">
      אם לא נרשמת ל-מחציות +, ניתן להתעלם מהודעה זו.
    </div>
    <div style="font-size:11px;color:#334155;margin-top:12px;">
      &copy; 2026 מחציות +. כל הזכויות שמורות.
    </div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`,
    };
  }

  if (type === 'reset') {
    return {
      subject: 'איפוס סיסמה - מחציות +',
      html: `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0e1a;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0e1a;padding:40px 0;">
<tr><td align="center">
<table width="460" cellpadding="0" cellspacing="0" style="max-width:460px;width:100%;">

  <!-- Header with gradient -->
  <tr><td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:16px 16px 0 0;padding:32px 24px;text-align:center;">
    <img src="https://mhplus.online/logo.png" alt="מחציות +" width="80" height="auto" style="display:block;margin:0 auto 12px auto;border-radius:8px;" />
    <div style="font-size:28px;font-weight:700;color:#ffffff;letter-spacing:1px;">מחציות +</div>
    <div style="font-size:14px;color:rgba(255,255,255,0.8);margin-top:6px;">ניהול הוצאות משפחתי</div>
  </td></tr>

  <!-- Body -->
  <tr><td style="background-color:#141827;padding:36px 32px;text-align:center;">

    <div style="font-size:20px;font-weight:600;color:#e2e8f0;margin-bottom:8px;">איפוס סיסמה</div>
    <div style="font-size:14px;color:#94a3b8;margin-bottom:28px;">הזן את הקוד הבא כדי לאפס את הסיסמה</div>

    <!-- OTP Code Box -->
    <div style="background:linear-gradient(135deg,rgba(102,126,234,0.15),rgba(118,75,162,0.15));border:2px solid rgba(102,126,234,0.4);border-radius:12px;padding:24px 16px;margin:0 auto;max-width:280px;">
      <div style="font-size:42px;font-weight:700;color:#ffffff;letter-spacing:14px;font-family:'Courier New',monospace;direction:ltr;">${code}</div>
    </div>

    <div style="font-size:13px;color:#64748b;margin-top:20px;">הקוד תקף ל-10 דקות</div>

    <!-- Security notice -->
    <div style="background-color:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:16px;margin-top:24px;">
      <div style="font-size:13px;color:#f87171;">&#9888; לא ביקשת איפוס סיסמה?</div>
      <div style="font-size:12px;color:#94a3b8;margin-top:4px;">אם לא שלחת בקשה זו, התעלם מהודעה זו. הסיסמה שלך לא תשתנה.</div>
    </div>

  </td></tr>

  <!-- Footer -->
  <tr><td style="background-color:#0f1320;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;">
    <div style="font-size:12px;color:#475569;line-height:1.6;">
      מייל זה נשלח אוטומטית, אין להשיב עליו.
    </div>
    <div style="font-size:11px;color:#334155;margin-top:12px;">
      &copy; 2026 מחציות +. כל הזכויות שמורות.
    </div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`,
    };
  }

  // Default: login / email_verification — use magic-link-otp template
  return {
    subject: 'קוד אימות - מחציות +',
    html: `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0e1a;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0e1a;padding:40px 0;">
<tr><td align="center">
<table width="460" cellpadding="0" cellspacing="0" style="max-width:460px;width:100%;">

  <!-- Header with gradient -->
  <tr><td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:16px 16px 0 0;padding:32px 24px;text-align:center;">
    <img src="https://mhplus.online/logo.png" alt="מחציות +" width="80" height="auto" style="display:block;margin:0 auto 12px auto;border-radius:8px;" />
    <div style="font-size:28px;font-weight:700;color:#ffffff;letter-spacing:1px;">מחציות +</div>
    <div style="font-size:14px;color:rgba(255,255,255,0.8);margin-top:6px;">ניהול הוצאות משפחתי</div>
  </td></tr>

  <!-- Body -->
  <tr><td style="background-color:#141827;padding:36px 32px;text-align:center;">

    <div style="font-size:20px;font-weight:600;color:#e2e8f0;margin-bottom:8px;">קוד האימות שלך</div>
    <div style="font-size:14px;color:#94a3b8;margin-bottom:28px;">הזן את הקוד הבא כדי להתחבר</div>

    <!-- OTP Code Box -->
    <div style="background:linear-gradient(135deg,rgba(102,126,234,0.15),rgba(118,75,162,0.15));border:2px solid rgba(102,126,234,0.4);border-radius:12px;padding:24px 16px;margin:0 auto;max-width:280px;">
      <div style="font-size:42px;font-weight:700;color:#ffffff;letter-spacing:14px;font-family:'Courier New',monospace;direction:ltr;">${code}</div>
    </div>

    <div style="font-size:13px;color:#64748b;margin-top:20px;">הקוד תקף ל-10 דקות</div>

  </td></tr>

  <!-- Footer -->
  <tr><td style="background-color:#0f1320;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;">
    <div style="font-size:12px;color:#475569;line-height:1.6;">
      אם לא ביקשת קוד אימות, ניתן להתעלם מהודעה זו.
    </div>
    <div style="font-size:11px;color:#334155;margin-top:12px;">
      &copy; 2026 מחציות +. כל הזכויות שמורות.
    </div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`,
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, type } = await req.json();

    console.log(`Email OTP Send: Request for ${email}, type: ${type}`);

    if (!email || !type) {
      return new Response(
        JSON.stringify({ error: 'Email and type are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate type
    const validTypes = ['login', 'registration', 'reset', 'email_verification'];
    if (!validTypes.includes(type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid verification type' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'כתובת מייל לא תקינה' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Initialize Supabase client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim();

    // Rate limiting: max 3 codes per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: emailCount, error: countError } = await supabaseAdmin
      .from('sms_verification_codes')
      .select('*', { count: 'exact', head: true })
      .eq('phone_number', normalizedEmail)
      .gte('created_at', oneHourAgo);

    if (!countError && emailCount !== null && emailCount >= 3) {
      console.warn(`Email OTP Send: Rate limit exceeded for ${normalizedEmail}: ${emailCount} requests in last hour`);
      return new Response(
        JSON.stringify({ error: 'יותר מדי בקשות. אנא נסה שוב מאוחר יותר.' }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check for existing valid code first
    const { data: existingCode } = await supabaseAdmin
      .from('sms_verification_codes')
      .select('code, expires_at')
      .eq('phone_number', normalizedEmail)
      .eq('verification_type', type)
      .eq('verified', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let otpCode: string;
    let expiresAt: string;

    if (existingCode) {
      // Use existing valid code
      otpCode = existingCode.code;
      expiresAt = existingCode.expires_at;
      console.log(`Email OTP Send: Using existing code for ${normalizedEmail}`);
    } else {
      // Generate new code
      otpCode = generateOTPCode();
      const expiration = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      expiresAt = expiration.toISOString();

      // Store in database (reuse sms_verification_codes table, phone_number column holds email)
      const { error: insertError } = await supabaseAdmin
        .from('sms_verification_codes')
        .insert({
          phone_number: normalizedEmail,
          code: otpCode,
          verification_type: type,
          expires_at: expiresAt,
          verified: false,
          attempts: 0,
        });

      if (insertError) {
        console.error('Error storing email OTP code:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to store verification code' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log(`Email OTP Send: Created new code for ${normalizedEmail}`);
    }

    // Get email content based on type
    const { subject, html } = getEmailHtml(type, otpCode);

    // Send email via the send-email Edge Function (same pattern as send-password-reset)
    const { data: emailResult, error: emailError } = await supabaseAdmin.functions.invoke('send-email', {
      body: {
        to: normalizedEmail,
        subject,
        html,
      },
    });

    if (emailError) {
      console.error('Error sending email via send-email function:', emailError);
      return new Response(
        JSON.stringify({ error: 'שגיאה בשליחת המייל' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Email OTP Send: Email sent successfully to ${normalizedEmail}`, emailResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'קוד האימות נשלח למייל בהצלחה',
        expiresAt,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Email OTP Send function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
