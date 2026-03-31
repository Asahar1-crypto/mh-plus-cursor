import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  userId: string;
  accountId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  actionUrl?: string;
}

// ---- FCM Helper Functions (inline for Deno compatibility) ----

interface ServiceAccount {
  project_id: string;
  private_key: string;
  client_email: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: sa.client_email,
    sub: sa.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };

  const encode = (obj: unknown) => {
    const json = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(json);
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  };

  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const unsigned = `${headerB64}.${payloadB64}`;

  const pemContents = sa.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsigned)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const jwt = `${unsigned}.${sigB64}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Failed to get access token: ${err}`);
  }

  const tokenData = await tokenRes.json();
  cachedToken = {
    token: tokenData.access_token,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
  };

  return tokenData.access_token;
}

function isInQuietHours(current: string, start: string, end: string): boolean {
  if (start < end) {
    return current >= start && current < end;
  }
  return current >= start || current < end;
}

function buildFCMPayload(
  token: string,
  platform: string,
  notification: { title: string; body: string; imageUrl?: string },
  data: Record<string, string>,
  actionUrl?: string
) {
  const base: Record<string, unknown> = {
    token,
    notification: {
      title: notification.title,
      body: notification.body,
      ...(notification.imageUrl && { image: notification.imageUrl }),
    },
    data,
  };

  if (platform === 'android') {
    base.android = {
      priority: 'high',
      notification: {
        channel_id: 'family-finance',
        sound: 'default',
      },
    };
  } else if (platform === 'ios') {
    base.apns = {
      payload: {
        aps: {
          badge: 1,
          sound: 'default',
          'content-available': 1,
        },
      },
    };
  } else {
    base.webpush = {
      notification: {
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        vibrate: [200, 100, 200],
        require_interaction: false,
      },
      fcm_options: {
        link: actionUrl || '/',
      },
    };
  }

  return base;
}

// ---- Retry Logic ----

const NON_RETRYABLE_ERRORS = ['UNREGISTERED', 'INVALID_ARGUMENT', 'NOT_FOUND', 'PERMISSION_DENIED'];

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
  retried?: boolean;
}

async function attemptSend(
  token: string,
  message: Record<string, unknown>,
  accessToken: string,
  projectId: string,
): Promise<SendResult> {
  const fcmResponse = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    }
  );

  const fcmResult = await fcmResponse.json();

  if (fcmResponse.ok) {
    return { success: true, messageId: fcmResult.name };
  }

  const errorCode = fcmResult.error?.details?.[0]?.errorCode ||
    fcmResult.error?.status || 'UNKNOWN';

  return {
    success: false,
    error: fcmResult.error?.message,
    errorCode,
  };
}

async function sendToToken(
  token: string,
  message: Record<string, unknown>,
  accessToken: string,
  projectId: string,
): Promise<SendResult> {
  const result = await attemptSend(token, message, accessToken, projectId);

  if (!result.success && !NON_RETRYABLE_ERRORS.includes(result.errorCode!)) {
    console.log(`⏳ Retryable error (${result.errorCode}), retrying in 1s...`);
    await new Promise((r) => setTimeout(r, 1000));
    const retryResult = await attemptSend(token, message, accessToken, projectId);
    retryResult.retried = true;
    if (retryResult.success) {
      console.log(`✅ Succeeded on retry`);
    } else {
      console.error(`❌ Failed on retry: ${retryResult.error}`);
    }
    return retryResult;
  }

  return result;
}

// ---- Main Handler ----

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firebaseServiceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');

    // 🔒 SECURITY: This function is internal-only (called by other edge functions).
    // Verify the caller is using the service_role key (passed automatically by
    // supabase.functions.invoke() when the calling client was created with service_role key).
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.includes(supabaseServiceRoleKey)) {
      console.error('❌ Unauthorized: send-push-notification requires service_role key');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - internal function only' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!firebaseServiceAccountJson) {
      console.error('FIREBASE_SERVICE_ACCOUNT env var not set');
      return new Response(
        JSON.stringify({ error: 'Push notification service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const payload: NotificationRequest = await req.json();

    console.log(`📩 Push notification request: type=${payload.type}, userId=${payload.userId}`);

    // 1. Get user preferences
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', payload.userId)
      .eq('account_id', payload.accountId)
      .single();

    if (prefs && !prefs.push_enabled) {
      console.log('Push notifications disabled for user');
      return new Response(
        JSON.stringify({ success: false, reason: 'Push notifications disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check type-specific preferences
    if (prefs?.preferences) {
      const typePrefs = prefs.preferences[payload.type];
      if (typePrefs && !typePrefs.push) {
        console.log(`Push disabled for type: ${payload.type}`);
        return new Response(
          JSON.stringify({ success: false, reason: `Push disabled for type: ${payload.type}` }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 2. Check quiet hours (skip for urgent notification types)
    const urgentTypes = ['expense_pending_approval', 'invitation_received', 'budget_exceeded'];
    const isUrgent = urgentTypes.includes(payload.type);

    if (prefs?.quiet_hours_enabled && !isUrgent) {
      // Use Asia/Jerusalem timezone to correctly handle DST (UTC+2 winter, UTC+3 summer)
      const currentTime = new Intl.DateTimeFormat('he-IL', {
        timeZone: 'Asia/Jerusalem',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date());

      if (isInQuietHours(currentTime, prefs.quiet_hours_start, prefs.quiet_hours_end)) {
        console.log(`Quiet hours active (${currentTime}), skipping non-urgent push`);
        return new Response(
          JSON.stringify({ success: false, reason: 'Quiet hours active' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (isUrgent) {
      console.log(`📩 Urgent notification type "${payload.type}" - bypassing quiet hours`);
    }

    // 3. Get active device tokens
    const { data: tokens } = await supabase
      .from('device_tokens')
      .select('*')
      .eq('user_id', payload.userId)
      .eq('is_active', true);

    if (!tokens || tokens.length === 0) {
      console.log('No active device tokens found, signaling SMS fallback to caller.');
      return new Response(
        JSON.stringify({ success: true, fallback: 'sms' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Idempotency check: skip if an identical notification was already sent recently
    const now = new Date();
    const dateKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}-${String(now.getUTCHours()).padStart(2, '0')}`;
    const idempotencyKey = `${payload.userId}_${payload.type}_${JSON.stringify(payload.data || {})}_${dateKey}`;

    const { data: existingLog } = await supabase
      .from('notification_logs')
      .select('id')
      .eq('user_id', payload.userId)
      .eq('notification_type', payload.type)
      .eq('status', 'sent')
      .gt('created_at', new Date(now.getTime() - 60 * 60 * 1000).toISOString())
      .eq('data->>idempotency_key', idempotencyKey)
      .limit(1)
      .maybeSingle();

    if (existingLog) {
      console.log(`🔁 Deduplicated: notification already sent (key=${idempotencyKey})`);
      return new Response(
        JSON.stringify({ success: true, deduplicated: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Send to all active device tokens (with retry for transient errors)
    const serviceAccount: ServiceAccount = JSON.parse(firebaseServiceAccountJson);
    const accessToken = await getAccessToken(serviceAccount);
    const projectId = serviceAccount.project_id;
    const results = [];

    for (const deviceToken of tokens) {
      try {
        const message = buildFCMPayload(
          deviceToken.token,
          deviceToken.platform,
          {
            title: payload.title,
            body: payload.body,
            imageUrl: payload.imageUrl,
          },
          {
            type: payload.type,
            accountId: payload.accountId,
            ...(payload.actionUrl && { actionUrl: payload.actionUrl }),
            ...(payload.data || {}),
          },
          payload.actionUrl
        );

        const sendResult = await sendToToken(deviceToken.token, message, accessToken, projectId);

        if (sendResult.success) {
          results.push({ token: deviceToken.token, success: true, messageId: sendResult.messageId, platform: deviceToken.platform, deviceTokenId: deviceToken.id, retried: sendResult.retried });
          console.log(`✅ Sent to ${deviceToken.platform} device: ${sendResult.messageId}${sendResult.retried ? ' (on retry)' : ''}`);
        } else {
          // Deactivate invalid tokens
          if (['UNREGISTERED', 'INVALID_ARGUMENT', 'NOT_FOUND'].includes(sendResult.errorCode!)) {
            console.log(`Deactivating invalid token: ${deviceToken.id}`);
            await supabase
              .from('device_tokens')
              .update({ is_active: false })
              .eq('id', deviceToken.id);
          }

          results.push({ token: deviceToken.token, success: false, error: sendResult.error, platform: deviceToken.platform, deviceTokenId: deviceToken.id, retried: sendResult.retried });
          console.error(`❌ Failed for ${deviceToken.platform}: ${sendResult.error}${sendResult.retried ? ' (after retry)' : ''}`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        results.push({ token: deviceToken.token, success: false, error: errorMsg, platform: deviceToken.platform, deviceTokenId: deviceToken.id });
        console.error(`❌ Exception for ${deviceToken.platform}: ${errorMsg}`);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(`📊 Sent ${successCount}/${results.length} notifications successfully`);

    // Write a SINGLE notification_logs entry for the entire send attempt
    // This prevents duplicate log rows when multiple tokens exist for one user
    const firstSuccess = results.find((r) => r.success);
    const allErrors = results.filter((r) => !r.success).map((r) => r.error).join('; ');

    await supabase.from('notification_logs').insert({
      user_id: payload.userId,
      account_id: payload.accountId,
      notification_type: payload.type,
      channel: 'push',
      platform: firstSuccess?.platform || results[0]?.platform || 'web',
      title: payload.title,
      body: payload.body,
      data: { ...(payload.data || {}), idempotency_key: idempotencyKey },
      status: successCount > 0 ? 'sent' : 'failed',
      device_token_id: firstSuccess?.deviceTokenId || results[0]?.deviceTokenId || null,
      fcm_message_id: firstSuccess?.messageId || null,
      error_message: successCount > 0 ? null : (allErrors || 'All delivery attempts failed'),
    });

    return new Response(
      JSON.stringify({ success: true, results, successCount, totalCount: results.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Send push notification error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
