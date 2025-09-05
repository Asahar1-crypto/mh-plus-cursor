-- Allow public access to invitations by invitation_id for non-authenticated users
CREATE POLICY "Public can view invitation by invitation_id"
ON public.invitations 
FOR SELECT 
TO public
USING (
  accepted_at IS NULL 
  AND expires_at > now()
);