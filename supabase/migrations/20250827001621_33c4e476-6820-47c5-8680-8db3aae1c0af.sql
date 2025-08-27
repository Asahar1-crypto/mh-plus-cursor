-- Fix remaining security issues (avoiding duplicates)

-- 1. Add DELETE protection for critical business data tables (check if exists first)
DO $$
BEGIN
  -- Check and create DELETE policy for expenses
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'expenses' 
    AND policyname = 'Account admins can delete expenses'
  ) THEN
    EXECUTE 'CREATE POLICY "Account admins can delete expenses" ON public.expenses FOR DELETE USING (is_account_admin(auth.uid(), account_id))';
  END IF;

  -- Check and create DELETE policy for children
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'children' 
    AND policyname = 'Account admins can delete children'
  ) THEN
    EXECUTE 'CREATE POLICY "Account admins can delete children" ON public.children FOR DELETE USING (is_account_admin(auth.uid(), account_id))';
  END IF;

  -- Check and create DELETE policy for budgets
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'budgets' 
    AND policyname = 'Account admins can delete budgets'
  ) THEN
    EXECUTE 'CREATE POLICY "Account admins can delete budgets" ON public.budgets FOR DELETE USING (is_account_admin(auth.uid(), account_id))';
  END IF;

  -- Check and create DELETE policy for scanned_receipts
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'scanned_receipts' 
    AND policyname = 'Users can delete their own scanned receipts'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can delete their own scanned receipts" ON public.scanned_receipts FOR DELETE USING (user_id = auth.uid())';
  END IF;
END
$$;

-- 2. Create audit logging table if not exists
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit logs if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'audit_logs' 
    AND n.nspname = 'public'
    AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;

-- Create audit logs policy if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'audit_logs' 
    AND policyname = 'Only super admins can view audit logs'
  ) THEN
    EXECUTE 'CREATE POLICY "Only super admins can view audit logs" ON public.audit_logs FOR SELECT USING (is_super_admin(auth.uid()))';
  END IF;
END
$$;