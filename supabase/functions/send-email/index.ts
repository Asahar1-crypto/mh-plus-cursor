
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import sgMail from "npm:@sendgrid/mail@7.7.0";

// Initialize SendGrid with the API key
const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
if (!sendgridApiKey) {
  console.error("SENDGRID_API_KEY environment variable is not set!");
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
        hasTemplate: !!requestBody.templateId
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
    
    const { to, subject, text, html, templateId, dynamicTemplateData } = requestBody;

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

    console.log(`Preparing to send email to ${to} with subject ${subject}`);

    // Configure the email message
    const msg = {
      to,
      from: "noreply@mchatziot.plus", // This email domain should be verified in SendGrid
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
      // Return detailed error for debugging
      return new Response(
        JSON.stringify({
          error: "Failed to send email via SendGrid",
          details: sendError.message,
          code: sendError.code,
          response: sendError.response?.body || null,
        }),
        {
          status: 500,
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
