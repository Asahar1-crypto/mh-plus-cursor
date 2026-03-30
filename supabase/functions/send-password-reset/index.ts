import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
}

// Generate 6-digit OTP code
function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: PasswordResetRequest = await req.json();
    console.log('Password reset request for:', email);

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if user exists
    const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    if (userError) {
      console.error('Error checking users:', userError);
      throw new Error('שגיאה במערכת');
    }

    const user = users.users.find(u => u.email === email);
    if (!user) {
      console.log('User not found:', email);
      // Don't reveal if user exists or not for security
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Rate limiting: max 3 codes per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: codeCount, error: countError } = await supabaseAdmin
      .from('sms_verification_codes')
      .select('*', { count: 'exact', head: true })
      .eq('phone_number', email)
      .eq('verification_type', 'reset')
      .gte('created_at', oneHourAgo);

    if (!countError && codeCount !== null && codeCount >= 3) {
      console.warn(`Rate limit exceeded for ${email}: ${codeCount} requests in last hour`);
      return new Response(
        JSON.stringify({ error: 'יותר מדי בקשות. אנא נסה שוב מאוחר יותר.' }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check for existing valid code first
    const { data: existingCode } = await supabaseAdmin
      .from('sms_verification_codes')
      .select('code, expires_at')
      .eq('phone_number', email)
      .eq('verification_type', 'reset')
      .eq('verified', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let otpCode: string;

    if (existingCode) {
      // Reuse existing valid code
      otpCode = existingCode.code;
      console.log(`Using existing code for ${email}`);
    } else {
      // Generate new code
      otpCode = generateOTPCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      // Store in sms_verification_codes table
      const { error: insertError } = await supabaseAdmin
        .from('sms_verification_codes')
        .insert({
          phone_number: email,
          code: otpCode,
          verification_type: 'reset',
          expires_at: expiresAt,
          verified: false,
          attempts: 0,
          user_id: user.id,
        });

      if (insertError) {
        console.error('Error storing OTP code:', insertError);
        throw new Error('שגיאה בשמירת קוד האימות');
      }

      console.log(`Created new reset code for ${email}`);
    }

    // Send email via send-email Edge Function with inline HTML template
    const emailHtml = `<!DOCTYPE html>
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
      <div style="font-size:42px;font-weight:700;color:#ffffff;letter-spacing:14px;font-family:'Courier New',monospace;direction:ltr;">${otpCode}</div>
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
</html>`;

    const emailResponse = await supabaseAdmin.functions.invoke('send-email', {
      body: {
        to: email,
        subject: "איפוס סיסמה - MH Plus",
        html: emailHtml,
      }
    });

    console.log("Password reset email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-password-reset function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
