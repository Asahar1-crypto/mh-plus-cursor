-- Fix critical subscription data security issue
-- Add comprehensive RLS policies for subscription table

-- Add INSERT policy for subscriptions (only admins and system can create)
CREATE POLICY "Only super admins can create subscriptions" 
ON public.subscriptions 
FOR INSERT 
WITH CHECK (is_super_admin(auth.uid()));

-- Add UPDATE policy for subscriptions (only admins and system can update)
CREATE POLICY "Only super admins can update subscriptions" 
ON public.subscriptions 
FOR UPDATE 
USING (is_super_admin(auth.uid()));

-- Add DELETE policy for subscriptions (only super admins can delete)
CREATE POLICY "Only super admins can delete subscriptions" 
ON public.subscriptions 
FOR DELETE 
USING (is_super_admin(auth.uid()));

-- Create a secure function for edge functions to manage subscriptions
CREATE OR REPLACE FUNCTION public.upsert_subscription_secure(
  p_tenant_id uuid,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_status text,
  p_trial_ends_at timestamp with time zone DEFAULT NULL,
  p_subscription_starts_at timestamp with time zone DEFAULT NULL,
  p_current_period_start timestamp with time zone DEFAULT NULL,
  p_current_period_end timestamp with time zone DEFAULT NULL,
  p_canceled_at timestamp with time zone DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  subscription_id uuid;
BEGIN
  -- Insert or update subscription
  INSERT INTO public.subscriptions (
    tenant_id,
    stripe_customer_id,
    stripe_subscription_id,
    status,
    trial_ends_at,
    subscription_starts_at,
    current_period_start,
    current_period_end,
    canceled_at
  ) VALUES (
    p_tenant_id,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_status,
    p_trial_ends_at,
    p_subscription_starts_at,
    p_current_period_start,
    p_current_period_end,
    p_canceled_at
  )
  ON CONFLICT (tenant_id) 
  DO UPDATE SET
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    status = EXCLUDED.status,
    trial_ends_at = EXCLUDED.trial_ends_at,
    subscription_starts_at = EXCLUDED.subscription_starts_at,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    canceled_at = EXCLUDED.canceled_at,
    updated_at = now()
  RETURNING id INTO subscription_id;
  
  RETURN subscription_id;
END;
$$;