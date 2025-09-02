
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import sgMail from "npm:@sendgrid/mail@7.7.0";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize SendGrid with the API key
const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
console.log("SendGrid API Key exists:", !!sendgridApiKey);
console.log("SendGrid API Key length:", sendgridApiKey?.length || 0);
console.log("SendGrid API Key starts with:", sendgridApiKey?.substring(0, 3) || "N/A");
console.log("SendGrid API Key ends with:", sendgridApiKey?.substring(-4) || "N/A");

if (!sendgridApiKey) {
  console.error("SENDGRID_API_KEY environment variable is not set!");
} else if (!sendgridApiKey.startsWith("SG.")) {
  console.warn("API key does not start with \"SG.\".");
}

sgMail.setApiKey(sendgridApiKey || "");

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Interface for email request
interface EmailRequest {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
  testMode?: boolean;
}

// Function to load email settings from database
async function loadEmailSettings() {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'email_sender_email',
        'email_sender_name',
        'email_reply_to'
      ]);

    if (error) {
      console.error('Error loading email settings:', error);
      return {
        senderEmail: 'family@mhplus.online',
        senderName: 'מחציות פלוס',
        replyToEmail: 'family@mhplus.online'
      };
    }

    const settings = data?.reduce((acc, item) => {
      acc[item.setting_key] = item.setting_value;
      return acc;
    }, {} as Record<string, string>) || {};

    return {
      senderEmail: settings.email_sender_email || 'family@mhplus.online',
      senderName: settings.email_sender_name || 'מחציות פלוס',
      replyToEmail: settings.email_reply_to || 'family@mhplus.online'
    };
  } catch (error) {
    console.error('Failed to load email settings:', error);
    return {
      senderEmail: 'family@mhplus.online',
      senderName: 'מחציות פלוס',
      replyToEmail: 'family@mhplus.online'
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Received request to send email");
    
    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json() as EmailRequest;
      console.log("Request body parsed successfully:", JSON.stringify({
        to: requestBody.to,
        subject: requestBody.subject,
        hasHtml: !!requestBody.html,
        htmlLength: requestBody.html?.length,
        hasText: !!requestBody.text,
        hasTemplate: !!requestBody.templateId,
        testMode: requestBody.testMode
      }));
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const { to, subject, text, html, templateId, dynamicTemplateData, testMode } = requestBody;

    // If in test mode, just return success without sending
    if (testMode) {
      console.log("Test mode - not actually sending email");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Test mode - email not sent",
          details: { to, subject }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate required fields
    if (!to || !subject || (!text && !html && !templateId)) {
      console.error("Missing required fields", { to, subject, hasText: !!text, hasHtml: !!html, hasTemplate: !!templateId });
      return new Response(
        JSON.stringify({
          error: "Missing required fields: 'to', 'subject', and one of 'text', 'html', or 'templateId'",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if SendGrid API key is available
    if (!sendgridApiKey) {
      console.error("SendGrid API key not configured");
      return new Response(
        JSON.stringify({
          error: "Email service not configured",
          message: "SendGrid API key is missing"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Preparing to send email to ${to} with subject ${subject}`);

    // Load email settings from database
    const emailSettings = await loadEmailSettings();
    
    // Configure the email message with dynamic settings
    const msg = {
      to,
      from: {
        email: emailSettings.senderEmail,
        name: emailSettings.senderName
      },
      replyTo: emailSettings.replyToEmail,
      subject,
      text,
      html,
    };

    // If using a template, add template ID and data
    if (templateId) {
      Object.assign(msg, {
        templateId,
        dynamicTemplateData: dynamicTemplateData || {},
      });
    }

    console.log("Email configuration:", JSON.stringify({
      to: msg.to,
      from: msg.from,
      replyTo: msg.replyTo,
      subject: msg.subject,
      hasHtml: !!msg.html,
      htmlLength: msg.html?.length
    }));

    // Send the email
    try {
      const result = await sgMail.send(msg);
      console.log("Email sent successfully with status:", result[0]?.statusCode);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email sent successfully",
          details: { to, subject }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (sendError: any) {
      console.error("Error sending email with SendGrid:", sendError);
      
      // Create a fallback response indicating the email wasn't sent but the invitation was created
      return new Response(
        JSON.stringify({
          warning: "Failed to send email via SendGrid, but invitation was created",
          details: "User can still access invitation via the app",
          error: sendError.message,
          code: sendError.code,
        }),
        {
          status: 200, // Return 200 so the invitation process continues
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error: any) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to process email request",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
