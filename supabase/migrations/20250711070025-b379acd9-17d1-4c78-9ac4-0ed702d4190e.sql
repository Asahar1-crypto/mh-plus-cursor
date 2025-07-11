-- Drop the incorrect policy
DROP POLICY IF EXISTS "Users can view accounts they are invited to via auth" ON public.accounts;

-- Create a security definer function to get the current user's email
-- This is needed because we can't directly access auth.users.email in RLS policies
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Now create the policy using the function
CREATE POLICY "Users can view accounts they are invited to" 
ON public.accounts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.invitations
    WHERE invitations.account_id = accounts.id 
    AND invitations.email = public.get_current_user_email()
    AND invitations.accepted_at IS NULL
    AND invitations.expires_at > now()
  )
);