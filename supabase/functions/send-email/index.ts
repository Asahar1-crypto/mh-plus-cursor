
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import sgMail from "npm:@sendgrid/mail@7.7.0";

// Initialize SendGrid with the API key
const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
sgMail.setApiKey(sendgridApiKey);

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
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, text, html, templateId, dynamicTemplateData } = await req.json() as EmailRequest;

    // Validate required fields
    if (!to || !subject || (!text && !html && !templateId)) {
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

    // Configure the email message
    const msg = {
      to,
      from: "noreply@mchatziot.plus", // Replace with your verified sender
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

    // Send the email
    await sgMail.send(msg);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to send email",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
