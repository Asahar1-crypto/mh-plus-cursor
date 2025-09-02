-- Create functions to handle trial expiration and subscription validation

-- Function to update expired trials
CREATE OR REPLACE FUNCTION public.update_expired_trials()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.accounts 
  SET subscription_status = 'expired'
  WHERE subscription_status = 'trial' 
    AND trial_ends_at < now();
END;
$$;

-- Function to check if account has active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(account_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.accounts 
    WHERE id = account_uuid 
    AND (
      subscription_status = 'active' 
      OR (subscription_status = 'trial' AND trial_ends_at > now())
    )
  );
END;
$$;

-- Update RLS policies for expenses to block operations on expired accounts
DROP POLICY IF EXISTS "Account members can create expenses" ON public.expenses;
CREATE POLICY "Account members can create expenses" 
ON public.expenses 
FOR INSERT 
WITH CHECK (
  is_account_member(auth.uid(), account_id) 
  AND has_active_subscription(account_id)
);

DROP POLICY IF EXISTS "Expense creators and account admins can update expenses" ON public.expenses;
CREATE POLICY "Expense creators and account admins can update expenses" 
ON public.expenses 
FOR UPDATE 
USING (
  ((paid_by_id = auth.uid()) OR is_account_admin(auth.uid(), account_id))
  AND has_active_subscription(account_id)
);

-- Update RLS policies for children to block operations on expired accounts
DROP POLICY IF EXISTS "Account members can create children" ON public.children;
CREATE POLICY "Account members can create children" 
ON public.children 
FOR INSERT 
WITH CHECK (
  is_account_member(auth.uid(), account_id) 
  AND has_active_subscription(account_id)
);

DROP POLICY IF EXISTS "Account admins can manage children" ON public.children;
CREATE POLICY "Account admins can manage children" 
ON public.children 
FOR UPDATE 
USING (
  is_account_admin(auth.uid(), account_id)
  AND has_active_subscription(account_id)
);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_expired_trials() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO authenticated;