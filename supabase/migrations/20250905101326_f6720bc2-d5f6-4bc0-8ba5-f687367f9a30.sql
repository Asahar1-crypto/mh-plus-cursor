-- Allow public access to view accounts that have pending invitations
CREATE POLICY "Public can view account info for valid invitations"
ON public.accounts 
FOR SELECT 
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.invitations 
    WHERE invitations.account_id = accounts.id 
    AND invitations.accepted_at IS NULL 
    AND invitations.expires_at > now()
  )
);