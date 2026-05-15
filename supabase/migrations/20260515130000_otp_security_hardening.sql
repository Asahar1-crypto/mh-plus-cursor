-- =====================================================
-- OTP security hardening
-- =====================================================
-- Goals:
--   1. Track caller IP per code so we can rate-limit by IP, not just by phone
--      (single attacker can spam many phones from one IP).
--   2. Provide an atomic helper for incrementing verify attempts so two
--      simultaneous wrong-code submissions can't race past the brute-force
--      threshold.

-- 1. IP column (nullable: historical rows have no IP).
ALTER TABLE public.sms_verification_codes
  ADD COLUMN IF NOT EXISTS ip_address INET;

CREATE INDEX IF NOT EXISTS idx_sms_verification_ip_created
  ON public.sms_verification_codes (ip_address, created_at DESC)
  WHERE ip_address IS NOT NULL;

-- 2. Atomic increment helper.
--    Returns the new attempts value, or NULL if no row was updated.
CREATE OR REPLACE FUNCTION public.increment_otp_attempts(p_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.sms_verification_codes
  SET attempts = attempts + 1
  WHERE id = p_id
  RETURNING attempts;
$$;

REVOKE ALL ON FUNCTION public.increment_otp_attempts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_otp_attempts(uuid) TO service_role;
