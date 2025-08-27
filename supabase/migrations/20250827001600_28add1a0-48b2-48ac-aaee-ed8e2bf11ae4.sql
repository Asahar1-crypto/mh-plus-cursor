-- Fix remaining security issues

-- 1. Add DELETE protection for critical business data tables
CREATE POLICY "Account admins can delete expenses" 
ON public.expenses 
FOR DELETE 
USING (is_account_admin(auth.uid(), account_id));

CREATE POLICY "Account admins can delete children" 
ON public.children 
FOR DELETE 
USING (is_account_admin(auth.uid(), account_id));

CREATE POLICY "Account admins can delete budgets" 
ON public.budgets 
FOR DELETE 
USING (is_account_admin(auth.uid(), account_id));

CREATE POLICY "Users can delete their own scanned receipts" 
ON public.scanned_receipts 
FOR DELETE 
USING (user_id = auth.uid());

-- 2. Improve invitation email protection with additional validation
CREATE OR REPLACE FUNCTION public.get_invitation_by_id_secure(invitation_uuid text)
RETURNS TABLE(
  id uuid,
  account_id uuid,
  email text,
  expires_at timestamp with time zone,
  accepted_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_email text;
BEGIN
  -- Get current user email
  SELECT get_current_user_email() INTO user_email;
  
  -- Only return invitation if email matches current user
  RETURN QUERY
  SELECT 
    i.id,
    i.account_id,
    i.email,
    i.expires_at,
    i.accepted_at
  FROM public.invitations i
  WHERE i.invitation_id = invitation_uuid
    AND LOWER(i.email) = LOWER(user_email)
    AND i.expires_at > now();
END;
$$;

-- 3. Add audit logging for subscription data access
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

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only super admins can view audit logs
CREATE POLICY "Only super admins can view audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (is_super_admin(auth.uid()));

-- Create function to log subscription access
CREATE OR REPLACE FUNCTION public.log_subscription_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    auth.uid(),
    TG_OP,
    'subscriptions',
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add trigger for subscription audit logging
CREATE TRIGGER subscription_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.log_subscription_access();