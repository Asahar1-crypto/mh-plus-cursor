import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegisterTokenRequest {
  token: string;
  platform: 'web' | 'android' | 'ios';
  accountId: string;
  deviceInfo?: Record<string, unknown>;
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
      console.error('Authentication failed:', claimsError?.message);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', userId);

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const payload: RegisterTokenRequest = await req.json();

    // Validate payload
    if (!payload.token || !payload.platform || !payload.accountId) {
      return new Response(
        JSON.stringify({ error: 'token, platform, and accountId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['web', 'android', 'ios'].includes(payload.platform)) {
      return new Response(
        JSON.stringify({ error: 'Invalid platform. Must be web, android, or ios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is member of the account
    const { data: isMember } = await supabase.rpc('is_account_member', {
      user_uuid: userId,
      account_uuid: payload.accountId,
    });

    if (!isMember) {
      return new Response(
        JSON.stringify({ error: 'Access denied: Not a member of this account' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert device token
    const { data, error } = await supabase
      .from('device_tokens')
      .upsert(
        {
          user_id: userId,
          account_id: payload.accountId,
          token: payload.token,
          platform: payload.platform,
          device_info: payload.deviceInfo || {},
          is_active: true,
          last_used_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,token',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error upserting device token:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create default notification preferences if they don't exist
    const { error: prefError } = await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: userId,
          account_id: payload.accountId,
          push_enabled: true,
        },
        {
          onConflict: 'user_id,account_id',
        }
      );

    if (prefError) {
      console.warn('Warning: Could not create default preferences:', prefError.message);
    }

    console.log('Device token registered successfully for user:', userId);

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Register device token error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
