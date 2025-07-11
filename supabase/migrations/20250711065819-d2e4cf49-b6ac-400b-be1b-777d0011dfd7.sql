-- Drop the previous policy and create a better one that uses auth.uid()
DROP POLICY IF EXISTS "Users can view accounts they are invited to" ON public.accounts;

-- Create a new policy that uses auth.uid() instead of auth.email()
-- First we need to join through profiles to get the user's email
CREATE POLICY "Users can view accounts they are invited to via auth" 
ON public.accounts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.invitations
    JOIN public.profiles ON profiles.id = auth.uid()
    WHERE invitations.account_id = accounts.id 
    AND invitations.email = profiles.name -- assuming email is stored in profiles.name or we need another approach
    AND invitations.accepted_at IS NULL
    AND invitations.expires_at > now()
  )
);