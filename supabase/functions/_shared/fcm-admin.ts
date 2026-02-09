/**
 * Firebase Cloud Messaging Admin SDK helper for Deno / Supabase Edge Functions.
 *
 * Firebase Admin SDK doesn't run natively in Deno, so we use the REST API
 * with a service account JWT for authentication.
 */

interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
}

interface FCMMessage {
  token: string;
  notification?: {
    title: string;
    body: string;
    image?: string;
  };
  data?: Record<string, string>;
  android?: Record<string, unknown>;
  apns?: Record<string, unknown>;
  webpush?: Record<string, unknown>;
}

// Cache the access token
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Create a JWT and exchange it for an OAuth2 access token
 */
async function getAccessToken(serviceAccount: ServiceAccount): Promise<string> {
  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600, // 1 hour
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };

  // Base64url encode
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
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Sign with the private key
  const privateKeyPem = serviceAccount.private_key;
  const pemContents = privateKeyPem
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
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const jwt = `${unsignedToken}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const tokenData = await tokenResponse.json();
  cachedToken = {
    token: tokenData.access_token,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
  };

  return tokenData.access_token;
}

/**
 * Send a message via FCM HTTP v1 API
 */
export async function sendFCMMessage(
  serviceAccountJson: string,
  message: FCMMessage
): Promise<{ success: boolean; messageId?: string; error?: string; errorCode?: string }> {
  try {
    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountJson);
    const accessToken = await getAccessToken(serviceAccount);
    const projectId = serviceAccount.project_id;

    const response = await fetch(
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

    const result = await response.json();

    if (response.ok) {
      return { success: true, messageId: result.name };
    } else {
      const errorCode = result.error?.details?.[0]?.errorCode || result.error?.status || 'UNKNOWN';
      return {
        success: false,
        error: result.error?.message || 'Unknown FCM error',
        errorCode,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if an FCM error indicates the token is invalid and should be deactivated
 */
export function isInvalidTokenError(errorCode: string): boolean {
  return [
    'UNREGISTERED',
    'INVALID_ARGUMENT',
    'NOT_FOUND',
  ].includes(errorCode);
}

/**
 * Build a platform-specific FCM message
 */
export function buildFCMMessage(
  token: string,
  platform: 'web' | 'android' | 'ios',
  notification: { title: string; body: string; imageUrl?: string },
  data: Record<string, string>,
  actionUrl?: string
): FCMMessage {
  const baseMessage: FCMMessage = {
    token,
    notification: {
      title: notification.title,
      body: notification.body,
      ...(notification.imageUrl && { image: notification.imageUrl }),
    },
    data,
  };

  if (platform === 'android') {
    return {
      ...baseMessage,
      android: {
        priority: 'high',
        notification: {
          channel_id: 'family-finance',
          sound: 'default',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
    };
  } else if (platform === 'ios') {
    return {
      ...baseMessage,
      apns: {
        payload: {
          aps: {
            badge: 1,
            sound: 'default',
            'content-available': 1,
          },
        },
      },
    };
  } else {
    // Web
    return {
      ...baseMessage,
      webpush: {
        notification: {
          icon: '/icon-192.png',
          badge: '/badge-72.png',
          vibrate: [200, 100, 200],
          require_interaction: false,
        },
        fcm_options: {
          link: actionUrl || '/',
        },
      },
    };
  }
}
