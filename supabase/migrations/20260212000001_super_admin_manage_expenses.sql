-- Allow super admins to update and delete any expense (for fixing mistakes, cleanup, etc.)
CREATE POLICY "Super admins can manage all expenses" 
ON public.expenses 
FOR ALL 
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));
