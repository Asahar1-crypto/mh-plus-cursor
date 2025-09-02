-- Create an edge function to get unverified users
-- First, let's add a view to get unverified users with their details
CREATE OR REPLACE FUNCTION public.get_unverified_users()
RETURNS TABLE(
  id uuid,
  email text,
  created_at timestamp with time zone,
  email_confirmed_at timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  raw_user_meta_data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'auth'
AS $$
BEGIN
  -- Check if the current user is a super admin
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Only super admins can view unverified users';
  END IF;
  
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.created_at,
    u.email_confirmed_at,
    u.last_sign_in_at,
    u.raw_user_meta_data
  FROM auth.users u
  WHERE u.email_confirmed_at IS NULL
  ORDER BY u.created_at DESC;
END;
$$;