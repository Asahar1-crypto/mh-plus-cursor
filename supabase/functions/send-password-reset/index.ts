import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: PasswordResetRequest = await req.json();
    console.log('🚀 Password reset request for:', email);

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

    // Generate password reset token using Supabase
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
    });

    if (error) {
      console.error('Error generating reset link:', error);
      throw new Error('שגיאה ביצירת קישור איפוס');
    }

    console.log('Generated reset link:', data.properties?.action_link);

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "MH Plus <no-reply@mhplus.online>",
      to: [email],
      subject: "איפוס סיסמה - MH Plus",
      html: `
        <div style="direction: rtl; text-align: right; font-family: Arial, sans-serif;">
          <h1>איפוס סיסמה</h1>
          <p>שלום,</p>
          <p>קיבלנו בקשה לאיפוס הסיסמה עבור החשבון שלך ב-MH Plus.</p>
          <p>לחץ על הקישור הבא כדי ליצור סיסמה חדשה:</p>
          <p>
            <a href="${data.properties?.action_link}" 
               style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              איפוס סיסמה
            </a>
          </p>
          <p>הקישור תקף למשך 24 שעות.</p>
          <p>אם לא ביקשת איפוס סיסמה, אנא התעלם מהמייל הזה.</p>
          <br>
          <p>בברכה,<br>צוות MH Plus</p>
        </div>
      `,
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