-- Create a SECURITY DEFINER function that returns only safe profile data for account members
CREATE OR REPLACE FUNCTION public.get_account_member_profile(member_user_id uuid)
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name
  FROM public.profiles p
  JOIN public.account_members am1 ON am1.user_id = p.id
  JOIN public.account_members am2 ON am2.account_id = am1.account_id
  WHERE p.id = member_user_id
    AND am2.user_id = auth.uid()
  LIMIT 1;
$$;

-- Create a function to get all account members' basic info (id and name only)
CREATE OR REPLACE FUNCTION public.get_account_members_basic_info(account_uuid uuid)
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name
  FROM public.profiles p
  JOIN public.account_members am ON am.user_id = p.id
  WHERE am.account_id = account_uuid
    AND public.is_account_member(auth.uid(), account_uuid);
$$;

-- Drop the existing policy that exposes all profile columns to account members
DROP POLICY IF EXISTS "Account members can view other members names" ON public.profiles;