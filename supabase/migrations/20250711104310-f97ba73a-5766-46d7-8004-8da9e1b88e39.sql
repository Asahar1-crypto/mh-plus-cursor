-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Account members can create expenses" ON public.expenses;

-- Create a simpler INSERT policy
CREATE POLICY "Account members can create expenses" 
ON public.expenses 
FOR INSERT 
WITH CHECK (is_account_member(auth.uid(), account_id));