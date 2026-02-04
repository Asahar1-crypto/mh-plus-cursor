-- ===========================================
-- FIX: SMS verification codes - tighten INSERT policy
-- Remove the user_id IS NULL bypass for better security
-- ===========================================
DROP POLICY IF EXISTS "Authenticated users can insert their own SMS codes" ON public.sms_verification_codes;

-- Allow authenticated users to insert codes for themselves
-- For registration (unauthenticated), edge functions use service role
CREATE POLICY "Authenticated users can insert their own SMS codes"
ON public.sms_verification_codes
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
);

-- ===========================================
-- FIX: Add explicit default-deny for anonymous users on profiles
-- This makes the security intention clearer
-- ===========================================
-- No additional policy needed - RLS already denies by default
-- All existing policies require authentication

-- ===========================================
-- FIX: Ensure helper functions return NULL for anonymous users
-- These functions already use auth.uid() which returns NULL for anon
-- ===========================================
-- Verify get_current_user_email is secure
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT CASE 
    WHEN auth.uid() IS NULL THEN NULL
    ELSE (SELECT email FROM auth.users WHERE id = auth.uid())
  END;
$$;

-- Verify get_current_user_phone is secure  
CREATE OR REPLACE FUNCTION public.get_current_user_phone()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN auth.uid() IS NULL THEN NULL
    ELSE (SELECT phone_e164 FROM public.profiles WHERE id = auth.uid())
  END;
$$;