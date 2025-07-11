-- Check current RLS policies on expenses table
\dp public.expenses;

-- Fix the RLS policy for inserting expenses
-- The current policy requires paid_by_id = auth.uid(), but we need to allow 
-- account members to create expenses for any account member

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Account members can create expenses" ON public.expenses;

-- Create a new INSERT policy that allows account members to create expenses for any member
CREATE POLICY "Account members can create expenses" 
ON public.expenses 
FOR INSERT 
WITH CHECK (
  is_account_member(auth.uid(), account_id) AND
  -- Ensure the paid_by user is also a member of the same account
  EXISTS (
    SELECT 1 FROM public.account_members 
    WHERE account_id = expenses.account_id 
    AND user_id = expenses.paid_by_id
  )
);