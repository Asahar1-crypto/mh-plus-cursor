import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phoneNumber?: string;
  phoneVerified?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, name, phoneNumber, phoneVerified }: RegisterRequest = await req.json();

    console.log(`Registering user: ${email}`);

    // Validate required fields
    if (!email || !password || !name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create user with admin API - this bypasses email confirmation
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email since we verified via SMS
      user_metadata: {
        name,
        phone_number: phoneNumber,
        phone_verified: phoneVerified || false,
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userData.user) {
      return new Response(
        JSON.stringify({ error: "Failed to create user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User created successfully:", userData.user.id);

    // Update profile with phone number if provided
    if (phoneNumber) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          phone_number: phoneNumber,
          phone_e164: phoneNumber,
          phone_verified: phoneVerified || false,
          raw_phone_input: phoneNumber,
        })
        .eq("id", userData.user.id);

      if (profileError) {
        console.error("Error updating profile with phone:", profileError);
      } else {
        console.log("Profile updated with phone number");
      }

      // Update SMS verification record with user_id.
      // .order()/.limit() are not supported on .update() – select the target row first.
      const { data: latestSmsCode } = await supabaseAdmin
        .from("sms_verification_codes")
        .select("id")
        .eq("phone_number", phoneNumber)
        .eq("verification_type", "registration")
        .is("user_id", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestSmsCode) {
        const { error: smsError } = await supabaseAdmin
          .from("sms_verification_codes")
          .update({ user_id: userData.user.id })
          .eq("id", latestSmsCode.id);

        if (smsError) {
          console.error("Error updating SMS verification:", smsError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: userData.user.id,
          email: userData.user.email,
          name,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
