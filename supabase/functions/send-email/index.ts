
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import sgMail from "npm:@sendgrid/mail@7.7.0";

// Initialize SendGrid with the API key
const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
console.log("SendGrid API Key exists:", !!sendgridApiKey);
console.log("SendGrid API Key length:", sendgridApiKey?.length || 0);
console.log("SendGrid API Key starts with:", sendgridApiKey?.substring(0, 10) || "N/A");
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

    // Configure the email message - Using the new sender email
    const msg = {
      to,
      from: "stylecaps2@gmail.com", // Updated sender email as requested
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
