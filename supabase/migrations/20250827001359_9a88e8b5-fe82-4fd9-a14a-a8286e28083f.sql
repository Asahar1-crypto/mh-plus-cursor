-- Fix critical security issues

-- 1. Fix invitations table RLS - remove overly permissive policy
DROP POLICY IF EXISTS "Users can view invitations by ID" ON public.invitations;

-- Add proper restrictive policies for invitations
CREATE POLICY "Users can view their own invitations" 
ON public.invitations 
FOR SELECT 
USING (email = get_current_user_email());

-- 2. Add RLS policies for system_settings table
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only super admins can view system settings" 
ON public.system_settings 
FOR SELECT 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Only super admins can manage system settings" 
ON public.system_settings 
FOR ALL 
USING (is_super_admin(auth.uid()));

-- 3. Add better invitation validation
CREATE OR REPLACE FUNCTION public.validate_invitation_access(invitation_uuid text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invitation_email text;
  user_email text;
BEGIN
  -- Get invitation email
  SELECT email INTO invitation_email 
  FROM public.invitations 
  WHERE invitation_id = invitation_uuid;
  
  -- Get current user email
  SELECT get_current_user_email() INTO user_email;
  
  -- Return true if emails match
  RETURN LOWER(invitation_email) = LOWER(user_email);
END;
$$;