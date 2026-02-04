-- ===========================================
-- FIX 1: Remove public access to profiles table
-- ===========================================
DROP POLICY IF EXISTS "Public can view profile names for invitation account owners" ON public.profiles;

-- ===========================================
-- FIX 2: Remove public access to accounts table
-- ===========================================
DROP POLICY IF EXISTS "Public can view account info for valid invitations" ON public.accounts;

-- ===========================================
-- FIX 3: Secure sms_verification_codes table
-- Ensure only authenticated users can access their own codes
-- ===========================================
DROP POLICY IF EXISTS "Users can manage their own SMS codes" ON public.sms_verification_codes;

-- Create explicit deny-all for anon users and allow only for authenticated users
CREATE POLICY "Authenticated users can view their own SMS codes"
ON public.sms_verification_codes
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (
    user_id = auth.uid() 
    OR phone_number = (SELECT phone_e164 FROM public.profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Authenticated users can insert their own SMS codes"
ON public.sms_verification_codes
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (
    user_id = auth.uid() 
    OR user_id IS NULL
  )
);

CREATE POLICY "Authenticated users can update their own SMS codes"
ON public.sms_verification_codes
FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND (
    user_id = auth.uid() 
    OR phone_number = (SELECT phone_e164 FROM public.profiles WHERE id = auth.uid())
  )
);

-- ===========================================
-- FIX 4: Secure email_change_requests table
-- ===========================================
DROP POLICY IF EXISTS "Users can view their own email change requests" ON public.email_change_requests;
DROP POLICY IF EXISTS "Users can create email change requests" ON public.email_change_requests;

-- Create secure policies that require authentication
CREATE POLICY "Authenticated users can view their own email change requests"
ON public.email_change_requests
FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Authenticated users can create their own email change requests"
ON public.email_change_requests
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Authenticated users can update their own email change requests"
ON public.email_change_requests
FOR UPDATE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());