-- Add policy to allow users to update invitations meant for them (to mark as accepted)
CREATE POLICY "Users can update invitations for their email" 
ON public.invitations 
FOR UPDATE 
USING (email = get_current_user_email())
WITH CHECK (email = get_current_user_email());