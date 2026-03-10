-- Security fix: UPDATE policy used paid_by_id instead of created_by_id.
--
-- Bug: if Parent A created an expense but set Parent B as paid_by_id,
-- Parent B could edit/update that expense (including changing the amount
-- of an already-approved expense), which is incorrect.
--
-- Fix: replace paid_by_id with created_by_id so that only the creator
-- (or an account admin) can modify an expense.

DROP POLICY IF EXISTS "Expense creators and account admins can update expenses" ON public.expenses;

CREATE POLICY "Expense creators and account admins can update expenses"
ON public.expenses
FOR UPDATE
USING (
  (created_by_id = auth.uid() OR is_account_admin(auth.uid(), account_id))
  AND has_active_subscription(account_id)
);
