-- Add a new RLS policy that allows users to view accounts they have been invited to
-- This policy will allow viewing account details for invitation acceptance

CREATE POLICY "Users can view accounts they are invited to" 
ON public.accounts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.invitations 
    WHERE invitations.account_id = accounts.id 
    AND invitations.email = auth.email()
    AND invitations.accepted_at IS NULL
    AND invitations.expires_at > now()
  )
);