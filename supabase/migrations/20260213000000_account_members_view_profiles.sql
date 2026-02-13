-- Fix: Allow account members to view names of other members in the same account
-- This enables the expense "created by" and "paid by" display to show real names instead of "Unknown"
-- The policy was removed in 20251210130545 but is needed for expense join queries to work

CREATE POLICY "Account members can view other members names"
ON public.profiles
FOR SELECT
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.account_members am1
    JOIN public.account_members am2 ON am2.account_id = am1.account_id
    WHERE am1.user_id = profiles.id
      AND am2.user_id = auth.uid()
  )
);
