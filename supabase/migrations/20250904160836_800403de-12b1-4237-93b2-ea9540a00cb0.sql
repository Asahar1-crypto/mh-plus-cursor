-- Allow account admins to view invitations for their accounts
CREATE POLICY "Account admins can view invitations for their accounts" 
ON public.invitations 
FOR SELECT 
USING (is_account_admin(auth.uid(), account_id));