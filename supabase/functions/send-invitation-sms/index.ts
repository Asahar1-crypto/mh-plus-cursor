import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { parsePhoneNumber } from 'https://esm.sh/libphonenumber-js@1.10.51';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vonageApiKey = Deno.env.get('VONAGE_API_KEY');
    const vonageApiSecret = Deno.env.get('VONAGE_API_SECRET');
    const vonageFromNumber = Deno.env.get('VONAGE_FROM_NUMBER');

    if (!vonageApiKey || !vonageApiSecret || !vonageFromNumber) {
      console.error('Missing Vonage credentials');
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { 
      phoneNumber, 
      invitationId, 
      accountName, 
      inviterName,
      baseUrl 
    } = await req.json();

    console.log(`Send invitation SMS request for: ${phoneNumber}`);

    if (!phoneNumber || !invitationId || !accountName) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: phoneNumber, invitationId, accountName' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Normalize phone number using libphonenumber-js
    let normalizedPhone;
    try {
      const parsed = parsePhoneNumber(phoneNumber, 'IL');
      normalizedPhone = parsed ? parsed.format('E.164') : phoneNumber;
      console.log('Phone normalization:', { original: phoneNumber, normalized: normalizedPhone });
    } catch (error) {
      console.log('Phone parsing failed, using original:', phoneNumber);
      normalizedPhone = phoneNumber;
    }

    // Create invitation URL
    const invitationUrl = `${baseUrl || 'https://family-finance-plus.lovable.app'}/family-invitation?invitationId=${invitationId}`;

    // Create SMS message (keep it short for SMS)
    const smsMessage = `שלום! ${inviterName || 'מישהו'} הזמין/ה אותך להצטרף לחשבון "${accountName}" באפליקציית מחציות פלוס.\n\nלהצטרפות: ${invitationUrl}\n\nתוקף: 48 שעות`;

    console.log(`Sending invitation SMS to ${normalizedPhone}`);
    console.log(`Message length: ${smsMessage.length} characters`);

    // Remove '+' from phone number for Vonage
    const cleanPhoneNumber = normalizedPhone.replace(/^\+/, '');

    // Send SMS using Vonage
    const vonageResponse = await fetch('https://rest.nexmo.com/sms/json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: vonageApiKey,
        api_secret: vonageApiSecret,
        from: vonageFromNumber,
        to: cleanPhoneNumber,
        text: smsMessage,
        type: 'unicode'
      }),
    });

    const vonageResult = await vonageResponse.json();
    
    console.log('Vonage response:', JSON.stringify(vonageResult));
    
    // Vonage returns status in messages array
    if (vonageResult.messages && vonageResult.messages[0]?.status === '0') {
      console.log(`Invitation SMS sent successfully. Message ID: ${vonageResult.messages[0]['message-id']}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          messageId: vonageResult.messages[0]['message-id'],
          status: 'sent'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      const errorText = vonageResult.messages?.[0]?.['error-text'] || 'Unknown error';
      console.error('Vonage error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send SMS', 
          details: errorText,
          vonageError: vonageResult
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Send invitation SMS function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
