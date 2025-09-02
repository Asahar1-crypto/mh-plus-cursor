-- Fix RLS policies to allow super admin access to all data

-- Update accounts table policies to allow super admin full access
DROP POLICY IF EXISTS "Super admins can view all accounts" ON public.accounts;
CREATE POLICY "Super admins can view all accounts" 
ON public.accounts 
FOR SELECT 
USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can manage all accounts" ON public.accounts;
CREATE POLICY "Super admins can manage all accounts" 
ON public.accounts 
FOR ALL 
USING (is_super_admin(auth.uid()));

-- Update profiles table policies to allow super admin access
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
CREATE POLICY "Super admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (is_super_admin(auth.uid()));

-- Update account_members table policies to allow super admin access
DROP POLICY IF EXISTS "Super admins can view all memberships" ON public.account_members;
CREATE POLICY "Super admins can view all memberships" 
ON public.account_members 
FOR SELECT 
USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can manage all memberships" ON public.account_members;
CREATE POLICY "Super admins can manage all memberships" 
ON public.account_members 
FOR ALL 
USING (is_super_admin(auth.uid()));

-- Update expenses table to allow super admin access
DROP POLICY IF EXISTS "Super admins can view all expenses" ON public.expenses;
CREATE POLICY "Super admins can view all expenses" 
ON public.expenses 
FOR SELECT 
USING (is_super_admin(auth.uid()));

-- Update children table to allow super admin access  
DROP POLICY IF EXISTS "Super admins can view all children" ON public.children;
CREATE POLICY "Super admins can view all children" 
ON public.children 
FOR SELECT 
USING (is_super_admin(auth.uid()));

-- Update invitations table to allow super admin access
DROP POLICY IF EXISTS "Super admins can view all invitations" ON public.invitations;
CREATE POLICY "Super admins can view all invitations" 
ON public.invitations 
FOR SELECT 
USING (is_super_admin(auth.uid()));

-- Update the get_account_members_with_details function to allow super admin access
CREATE OR REPLACE FUNCTION public.get_account_members_with_details(account_uuid uuid)
 RETURNS TABLE(user_id uuid, user_name text, role account_member_role, joined_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  -- Allow super admins to access any account's members
  IF is_super_admin(auth.uid()) THEN
    RETURN QUERY
    SELECT 
      am.user_id,
      p.name as user_name,
      am.role,
      am.joined_at
    FROM public.account_members am
    JOIN public.profiles p ON p.id = am.user_id
    WHERE am.account_id = account_uuid
    ORDER BY am.role DESC, am.joined_at ASC;
    RETURN;
  END IF;

  -- Check if the current user is a member of the account
  IF NOT public.is_account_member(auth.uid(), account_uuid) THEN
    RAISE EXCEPTION 'Access denied: Not a member of this account';
  END IF;
  
  RETURN QUERY
  SELECT 
    am.user_id,
    p.name as user_name,
    am.role,
    am.joined_at
  FROM public.account_members am
  JOIN public.profiles p ON p.id = am.user_id
  WHERE am.account_id = account_uuid
  ORDER BY am.role DESC, am.joined_at ASC;
END;
$function$;