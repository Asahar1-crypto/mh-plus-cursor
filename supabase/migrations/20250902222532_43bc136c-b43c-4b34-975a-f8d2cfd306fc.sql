-- Fix the get_unverified_users function to ONLY return truly unverified users
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
    u.email::text,
    u.created_at,
    u.email_confirmed_at,
    u.last_sign_in_at,
    u.raw_user_meta_data
  FROM auth.users u
  WHERE u.email_confirmed_at IS NULL  -- Only unverified users
    AND u.deleted_at IS NULL          -- Not deleted users
  ORDER BY u.created_at DESC;
END;
$$;

-- Create a new function to get orphaned verified users (verified but not in any account)
CREATE OR REPLACE FUNCTION public.get_orphaned_verified_users()
RETURNS TABLE(
  id uuid,
  email text,
  created_at timestamp with time zone,
  email_confirmed_at timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  raw_user_meta_data jsonb,
  has_profile boolean,
  profile_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'auth'
AS $$
BEGIN
  -- Check if the current user is a super admin
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Only super admins can view orphaned users';
  END IF;
  
  RETURN QUERY
  SELECT 
    u.id,
    u.email::text,
    u.created_at,
    u.email_confirmed_at,
    u.last_sign_in_at,
    u.raw_user_meta_data,
    (p.id IS NOT NULL) as has_profile,
    p.name as profile_name
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.email_confirmed_at IS NOT NULL  -- Only verified users
    AND u.deleted_at IS NULL              -- Not deleted users
    AND NOT EXISTS (                      -- Not in any account
      SELECT 1 FROM public.account_members am 
      WHERE am.user_id = u.id
    )
  ORDER BY u.created_at DESC;
END;
$$;