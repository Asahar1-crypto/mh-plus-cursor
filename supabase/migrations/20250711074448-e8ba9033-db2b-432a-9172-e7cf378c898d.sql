-- Add policy to allow account admins to delete invitations for their account
CREATE POLICY "Account admins can delete their account invitations" 
ON public.invitations 
FOR DELETE 
USING (is_account_admin(auth.uid(), account_id));