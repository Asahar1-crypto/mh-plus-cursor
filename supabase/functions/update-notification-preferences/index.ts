import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdatePreferencesRequest {
  accountId: string;
  push_enabled?: boolean;
  sms_enabled?: boolean;
  email_enabled?: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  preferences?: Record<string, { push: boolean; sms: boolean; email: boolean }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jwt = authHeader.replace('Bearer ', '');
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(jwt);
    const userId = claimsData?.claims?.sub;

    if (claimsError || !userId) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const payload: UpdatePreferencesRequest = await req.json();

    if (!payload.accountId) {
      return new Response(
        JSON.stringify({ error: 'accountId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify membership
    const { data: isMember } = await supabase.rpc('is_account_member', {
      user_uuid: userId,
      account_uuid: payload.accountId,
    });

    if (!isMember) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build update object (only include defined fields)
    const updateData: Record<string, unknown> = {};
    if (payload.push_enabled !== undefined) updateData.push_enabled = payload.push_enabled;
    if (payload.sms_enabled !== undefined) updateData.sms_enabled = payload.sms_enabled;
    if (payload.email_enabled !== undefined) updateData.email_enabled = payload.email_enabled;
    if (payload.quiet_hours_enabled !== undefined) updateData.quiet_hours_enabled = payload.quiet_hours_enabled;
    if (payload.quiet_hours_start !== undefined) updateData.quiet_hours_start = payload.quiet_hours_start;
    if (payload.quiet_hours_end !== undefined) updateData.quiet_hours_end = payload.quiet_hours_end;
    if (payload.preferences !== undefined) updateData.preferences = payload.preferences;

    // Upsert preferences
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: userId,
          account_id: payload.accountId,
          ...updateData,
        },
        {
          onConflict: 'user_id,account_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error updating preferences:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Notification preferences updated for user:', userId);

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Update notification preferences error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
