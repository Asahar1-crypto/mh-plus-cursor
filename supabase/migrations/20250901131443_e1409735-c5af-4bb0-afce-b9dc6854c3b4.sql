-- Fix security vulnerability: Restrict access to invitations table
-- Current issue: Email addresses could be exposed through overly permissive policies

-- Drop existing policies that might allow broader access
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can update invitations for their email" ON public.invitations;
DROP POLICY IF EXISTS "Account admins can manage invitations" ON public.invitations;
DROP POLICY IF EXISTS "Account admins can delete their account invitations" ON public.invitations;

-- Create more restrictive policies

-- 1. Only allow authenticated users to view invitations sent specifically to their email
CREATE POLICY "Users can only view invitations sent to their email"
ON public.invitations
FOR SELECT
TO authenticated
USING (
  email = get_current_user_email() 
  AND accepted_at IS NULL 
  AND expires_at > now()
);

-- 2. Only allow authenticated users to update invitations sent to their email (for accepting)
CREATE POLICY "Users can only update their own pending invitations"
ON public.invitations
FOR UPDATE
TO authenticated
USING (
  email = get_current_user_email() 
  AND accepted_at IS NULL 
  AND expires_at > now()
)
WITH CHECK (
  email = get_current_user_email()
);

-- 3. Only account admins can create invitations for their accounts
CREATE POLICY "Only account admins can create invitations"
ON public.invitations
FOR INSERT
TO authenticated
WITH CHECK (
  is_account_admin(auth.uid(), account_id)
);

-- 4. Only account admins can delete invitations for their accounts
CREATE POLICY "Only account admins can delete invitations for their accounts"
ON public.invitations
FOR DELETE
TO authenticated
USING (
  is_account_admin(auth.uid(), account_id)
);

-- 5. Create a secure function for account admins to view their account's invitations
-- This prevents direct table access while still allowing admins to manage invitations
CREATE OR REPLACE FUNCTION public.get_account_invitations(account_uuid uuid)
RETURNS TABLE(
  id uuid,
  email text,
  invitation_id text,
  created_at timestamp with time zone,
  expires_at timestamp with time zone,
  accepted_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the current user is an admin of the account
  IF NOT is_account_admin(auth.uid(), account_uuid) THEN
    RAISE EXCEPTION 'Access denied: Only account admins can view invitations';
  END IF;
  
  -- Return only basic invitation info (no sensitive data)
  RETURN QUERY
  SELECT 
    i.id,
    i.email,
    i.invitation_id,
    i.created_at,
    i.expires_at,
    i.accepted_at
  FROM public.invitations i
  WHERE i.account_id = account_uuid
  ORDER BY i.created_at DESC;
END;
$$;