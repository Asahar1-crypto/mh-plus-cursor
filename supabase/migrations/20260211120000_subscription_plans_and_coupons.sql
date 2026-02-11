-- =============================================================
-- Migration: Subscription Plans, Coupons & Enhanced Subscriptions
-- =============================================================

-- =====================
-- 1. pricing_plans table
-- =====================
CREATE TABLE public.pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE, -- 'personal' / 'family'
  name TEXT NOT NULL,
  description TEXT,
  monthly_price NUMERIC(10,2) NOT NULL,
  yearly_price NUMERIC(10,2) NOT NULL,
  max_members INTEGER NOT NULL DEFAULT 1,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default plans
INSERT INTO public.pricing_plans (slug, name, description, monthly_price, yearly_price, max_members, features, sort_order) VALUES
(
  'personal',
  'Personal',
  'לניהול הוצאות אישי',
  19.90,
  119.00,
  1,
  '[
    {"text": "ניהול הוצאות", "included": true},
    {"text": "דוחות והתחשבנות", "included": true},
    {"text": "סריקת קבלות", "included": true},
    {"text": "ילדים ללא הגבלה", "included": true},
    {"text": "שיתוף עם בן/בת זוג", "included": false},
    {"text": "אישור הוצאות דו-צדדי", "included": false},
    {"text": "התראות משותפות", "included": false}
  ]'::jsonb,
  1
),
(
  'family',
  'Family',
  'לניהול הוצאות משותפות עם בן/בת זוג',
  29.90,
  229.00,
  2,
  '[
    {"text": "ניהול הוצאות", "included": true},
    {"text": "דוחות והתחשבנות", "included": true},
    {"text": "סריקת קבלות", "included": true},
    {"text": "ילדים ללא הגבלה", "included": true},
    {"text": "שיתוף עם בן/בת זוג", "included": true},
    {"text": "אישור הוצאות דו-צדדי", "included": true},
    {"text": "התראות משותפות", "included": true}
  ]'::jsonb,
  2
);

-- Indexes
CREATE INDEX idx_pricing_plans_slug ON public.pricing_plans(slug);
CREATE INDEX idx_pricing_plans_active ON public.pricing_plans(is_active) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER update_pricing_plans_updated_at
    BEFORE UPDATE ON public.pricing_plans
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

-- Everyone can read active plans (public pricing page)
CREATE POLICY "Anyone can view active pricing plans"
ON public.pricing_plans
FOR SELECT
USING (is_active = true);

-- Super admins can manage plans
CREATE POLICY "Super admins can manage pricing plans"
ON public.pricing_plans
FOR ALL
USING (public.is_super_admin(auth.uid()));

-- Grant read to anon for public pricing page
GRANT SELECT ON public.pricing_plans TO anon;
GRANT SELECT ON public.pricing_plans TO authenticated;

-- =====================
-- 2. coupons table
-- =====================
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free_months')),
  discount_value NUMERIC(10,2) NOT NULL, -- percentage (0-100), fixed amount, or number of months
  applicable_plans TEXT NOT NULL DEFAULT 'all' CHECK (applicable_plans IN ('all', 'personal', 'family')),
  applicable_billing TEXT NOT NULL DEFAULT 'all' CHECK (applicable_billing IN ('all', 'monthly', 'yearly')),
  max_redemptions INTEGER, -- NULL = unlimited
  current_redemptions INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_coupons_code ON public.coupons(code);
CREATE INDEX idx_coupons_active ON public.coupons(is_active) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER update_coupons_updated_at
    BEFORE UPDATE ON public.coupons
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Super admins can manage coupons
CREATE POLICY "Super admins can manage coupons"
ON public.coupons
FOR ALL
USING (public.is_super_admin(auth.uid()));

-- Authenticated users can validate coupons (read active ones by code)
CREATE POLICY "Authenticated users can view active coupons"
ON public.coupons
FOR SELECT
USING (is_active = true AND auth.uid() IS NOT NULL);

-- =====================
-- 3. coupon_redemptions table
-- =====================
CREATE TABLE public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  redeemed_by UUID NOT NULL REFERENCES auth.users(id),
  plan_slug TEXT NOT NULL,
  billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', 'yearly')),
  discount_applied NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(coupon_id, account_id) -- Each account can redeem a coupon only once
);

-- Indexes
CREATE INDEX idx_coupon_redemptions_coupon ON public.coupon_redemptions(coupon_id);
CREATE INDEX idx_coupon_redemptions_account ON public.coupon_redemptions(account_id);

-- RLS
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Super admins can view all redemptions
CREATE POLICY "Super admins can view all redemptions"
ON public.coupon_redemptions
FOR ALL
USING (public.is_super_admin(auth.uid()));

-- Account members can view their own redemptions
CREATE POLICY "Account members can view their redemptions"
ON public.coupon_redemptions
FOR SELECT
USING (account_id = ANY (get_user_account_ids(auth.uid())));

-- =====================
-- 4. Update subscriptions table
-- =====================
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.pricing_plans(id),
ADD COLUMN IF NOT EXISTS plan_slug TEXT,
ADD COLUMN IF NOT EXISTS billing_period TEXT DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly')),
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.coupons(id),
ADD COLUMN IF NOT EXISTS activated_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'manual' CHECK (payment_provider IN ('manual', 'stripe', 'tranzilla', 'payplus'));

-- Index for plan lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_slug ON public.subscriptions(plan_slug);
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing_period ON public.subscriptions(billing_period);

-- =====================
-- 5. Update accounts table - add plan info for quick access
-- =====================
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS plan_slug TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS billing_period TEXT DEFAULT NULL CHECK (billing_period IN ('monthly', 'yearly'));

-- =====================
-- 6. Update sync trigger to include plan info
-- =====================
CREATE OR REPLACE FUNCTION public.sync_account_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.accounts 
  SET subscription_status = NEW.status,
      trial_ends_at = NEW.trial_ends_at,
      plan_slug = NEW.plan_slug,
      billing_period = NEW.billing_period
  WHERE id = NEW.tenant_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- 7. Function to validate a coupon
-- =====================
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code TEXT,
  p_plan_slug TEXT,
  p_billing_period TEXT,
  p_account_id UUID
)
RETURNS TABLE(
  is_valid BOOLEAN,
  coupon_id UUID,
  discount_type TEXT,
  discount_value NUMERIC,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_coupon RECORD;
  v_already_redeemed BOOLEAN;
BEGIN
  -- Find coupon
  SELECT c.* INTO v_coupon
  FROM public.coupons c
  WHERE c.code = UPPER(TRIM(p_code))
    AND c.is_active = true;

  -- Coupon not found or inactive
  IF v_coupon IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, 'קוד קופון לא תקף'::TEXT;
    RETURN;
  END IF;

  -- Check date range
  IF v_coupon.valid_from > now() THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, 'קופון עדיין לא פעיל'::TEXT;
    RETURN;
  END IF;

  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < now() THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, 'קופון פג תוקף'::TEXT;
    RETURN;
  END IF;

  -- Check max redemptions
  IF v_coupon.max_redemptions IS NOT NULL AND v_coupon.current_redemptions >= v_coupon.max_redemptions THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, 'קופון מוצה - הגיע למקסימום השימושים'::TEXT;
    RETURN;
  END IF;

  -- Check plan applicability
  IF v_coupon.applicable_plans != 'all' AND v_coupon.applicable_plans != p_plan_slug THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, 'קופון לא תקף לתוכנית שנבחרה'::TEXT;
    RETURN;
  END IF;

  -- Check billing period applicability
  IF v_coupon.applicable_billing != 'all' AND v_coupon.applicable_billing != p_billing_period THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, 'קופון לא תקף לתקופת החיוב שנבחרה'::TEXT;
    RETURN;
  END IF;

  -- Check if already redeemed by this account
  SELECT EXISTS(
    SELECT 1 FROM public.coupon_redemptions cr
    WHERE cr.coupon_id = v_coupon.id AND cr.account_id = p_account_id
  ) INTO v_already_redeemed;

  IF v_already_redeemed THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, 'קופון כבר מומש עבור חשבון זה'::TEXT;
    RETURN;
  END IF;

  -- Valid!
  RETURN QUERY SELECT 
    true, 
    v_coupon.id, 
    v_coupon.discount_type, 
    v_coupon.discount_value,
    NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_coupon(TEXT, TEXT, TEXT, UUID) TO authenticated;

-- =====================
-- 8. Function to check plan member limits
-- =====================
CREATE OR REPLACE FUNCTION public.get_plan_max_members(p_plan_slug TEXT)
RETURNS INTEGER
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(max_members, 2) 
  FROM public.pricing_plans 
  WHERE slug = p_plan_slug AND is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_plan_max_members(TEXT) TO authenticated;

-- =====================
-- 9. Function to check if account can add members based on plan
-- =====================
CREATE OR REPLACE FUNCTION public.can_add_member(p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_plan_slug TEXT;
  v_subscription_status TEXT;
  v_max_members INTEGER;
  v_current_members INTEGER;
BEGIN
  -- Get account plan info
  SELECT plan_slug, subscription_status
  INTO v_plan_slug, v_subscription_status
  FROM public.accounts
  WHERE id = p_account_id;

  -- During trial, allow up to 2 members (Family experience)
  IF v_subscription_status = 'trial' THEN
    SELECT COUNT(*) INTO v_current_members
    FROM public.account_members
    WHERE account_id = p_account_id;
    RETURN v_current_members < 2;
  END IF;

  -- If no plan selected (expired without choosing), block
  IF v_plan_slug IS NULL THEN
    RETURN false;
  END IF;

  -- Get max members for plan
  v_max_members := public.get_plan_max_members(v_plan_slug);

  -- Count current members
  SELECT COUNT(*) INTO v_current_members
  FROM public.account_members
  WHERE account_id = p_account_id;

  RETURN v_current_members < v_max_members;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_add_member(UUID) TO authenticated;

-- =====================
-- 10. Grant permissions
-- =====================
GRANT SELECT ON public.coupons TO authenticated;
GRANT SELECT ON public.coupon_redemptions TO authenticated;
GRANT INSERT ON public.coupon_redemptions TO authenticated;
