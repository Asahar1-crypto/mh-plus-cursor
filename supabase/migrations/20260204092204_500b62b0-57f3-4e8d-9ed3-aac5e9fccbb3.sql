
-- Drop the permissive policy
DROP POLICY IF EXISTS "Users can create accounts" ON public.accounts;

-- Create a secure policy that ensures owner_id matches the authenticated user
CREATE POLICY "Users can create their own accounts"
ON public.accounts
FOR INSERT
WITH CHECK (owner_id = auth.uid());
