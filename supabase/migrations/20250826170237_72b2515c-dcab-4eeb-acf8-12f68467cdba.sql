-- יצירת טבלת הגדרות מערכת גלובליות
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- הכנסת הגדרות ברירת מחדל
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
('monthly_price', '50', 'מחיר חודשי בשקלים'),
('currency', 'ILS', 'מטבע (ILS/USD/EUR)'),
('trial_days', '14', 'מספר ימי ניסיון חינם'),
('app_name', 'Family Budget', 'שם האפליקציה'),
('support_email', 'support@familybudget.co.il', 'מייל תמיכה');

-- יצירת טבלת מנויים
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'expired', 'canceled')),
  trial_ends_at TIMESTAMPTZ,
  subscription_starts_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- הוספת שדות לטבלת accounts
ALTER TABLE public.accounts 
ADD COLUMN subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired', 'canceled')),
ADD COLUMN trial_ends_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '14 days');

-- הוספת שדות לטבלת profiles  
ALTER TABLE public.profiles
ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN last_login TIMESTAMPTZ;

-- יצירת אינדקסים לביצועים
CREATE INDEX idx_subscriptions_tenant_id ON public.subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_accounts_subscription_status ON public.accounts(subscription_status);
CREATE INDEX idx_profiles_is_super_admin ON public.profiles(is_super_admin) WHERE is_super_admin = TRUE;

-- יצירת טריגר לעדכון updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- יצירת פונקציה לבדיקת Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(is_super_admin, FALSE) 
  FROM public.profiles 
  WHERE id = user_uuid;
$$;

-- יצירת פונקציה לקבלת הגדרות מערכת
CREATE OR REPLACE FUNCTION public.get_system_setting(key_name TEXT)
RETURNS TEXT
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT setting_value 
  FROM public.system_settings 
  WHERE setting_key = key_name;
$$;

-- RLS policies for system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view system settings" 
ON public.system_settings 
FOR SELECT 
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage system settings" 
ON public.system_settings 
FOR ALL 
USING (public.is_super_admin(auth.uid()));

-- RLS policies for subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all subscriptions" 
ON public.subscriptions 
FOR SELECT 
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Account members can view their subscription" 
ON public.subscriptions 
FOR SELECT 
USING (tenant_id = ANY (get_user_account_ids(auth.uid())));

CREATE POLICY "Super admins can manage all subscriptions" 
ON public.subscriptions 
FOR ALL 
USING (public.is_super_admin(auth.uid()));

-- יצירת trigger לעדכון אוטומטי של subscription status ב-accounts
CREATE OR REPLACE FUNCTION public.sync_account_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.accounts 
  SET subscription_status = NEW.status,
      trial_ends_at = NEW.trial_ends_at
  WHERE id = NEW.tenant_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_subscription_status
    AFTER INSERT OR UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_account_subscription_status();

-- הענקת הרשאות
GRANT EXECUTE ON FUNCTION public.is_super_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_system_setting(TEXT) TO authenticated;