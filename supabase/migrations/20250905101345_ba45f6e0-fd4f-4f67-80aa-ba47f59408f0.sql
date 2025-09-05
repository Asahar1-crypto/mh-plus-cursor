-- Allow public access to view profile names for account owners with pending invitations
CREATE POLICY "Public can view profile names for invitation account owners"
ON public.profiles 
FOR SELECT 
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.accounts a
    JOIN public.invitations i ON i.account_id = a.id
    WHERE a.owner_id = profiles.id 
    AND i.accepted_at IS NULL 
    AND i.expires_at > now()
  )
);