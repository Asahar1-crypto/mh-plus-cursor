/**
 * OTP utilities shared across edge functions.
 *
 * SECURITY: never use Math.random() for OTP codes — it is predictable.
 * Use crypto.getRandomValues which is backed by a CSPRNG in Deno/V8.
 */

/**
 * Generate a 6-digit numeric OTP code using a cryptographically secure RNG.
 * Always returns a zero-padded 6-character string.
 *
 * Modulo bias note: the mapping uint32 → [0,1_000_000) is technically biased
 * by ~1 in 4.3B, far below any exploitable threshold for a 6-digit OTP that
 * already has only ~20 bits of entropy.
 */
export function generateOTPCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] % 1_000_000).toString().padStart(6, '0');
}

/**
 * Validate an E.164 phone number is an Israeli **mobile** number.
 * Israeli mobile prefixes after country code (+972) start with 5 (50, 52, 53,
 * 54, 55, 56, 58). Landlines (02-09 area codes) are NOT SMS-capable and
 * Vonage silently fails when sending to them.
 *
 * Returns false for non-E.164 input or any non-mobile Israeli number.
 */
export function isValidIsraeliMobile(phoneE164: string): boolean {
  if (typeof phoneE164 !== 'string') return false;
  // +9725XXXXXXXX — country code +972 then mobile prefix 5X then 7 digits
  return /^\+9725\d{8}$/.test(phoneE164);
}

/**
 * Best-effort caller IP from edge runtime headers. Returns null when no header
 * is present (e.g. direct invocation in tests).
 */
export function getCallerIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // First entry is the original client IP
    return forwarded.split(',')[0]!.trim();
  }
  return req.headers.get('x-real-ip');
}

/**
 * Resolve the secret used to HMAC-hash OTP codes at rest.
 * Prefers a dedicated `OTP_HASH_SECRET`; falls back to the service-role key
 * so the system remains functional before an operator sets a dedicated key.
 * Both values are server-side only and never reach the client.
 */
function getOtpHashSecret(): string {
  const dedicated = Deno.env.get('OTP_HASH_SECRET');
  if (dedicated && dedicated.length >= 16) return dedicated;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (serviceKey) return serviceKey;
  throw new Error('OTP hashing requires OTP_HASH_SECRET or SUPABASE_SERVICE_ROLE_KEY');
}

/**
 * HMAC-SHA256 hash of (code + identity) used to store OTP codes at rest.
 *
 * The identity (phone number or email) is mixed in so that knowing the
 * plaintext of one code never lets an attacker compute the hash for another
 * identity. With the server secret, brute-forcing the 6-digit code space
 * from a DB leak requires the secret too — making the leak unexploitable.
 */
export async function hashOtpCode(code: string, identity: string): Promise<string> {
  const secret = getOtpHashSecret();
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    enc.encode(`${code}|${identity}`),
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
