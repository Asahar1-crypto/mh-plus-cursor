-- מחיקת טריגרים קודם כדי לתקן את הפונקציות
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON public.system_settings;
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
DROP TRIGGER IF EXISTS sync_subscription_status ON public.subscriptions;

-- מחיקת הפונקציות
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_system_setting(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.sync_account_subscription_status() CASCADE;

-- יצירה מחדש עם search_path נכון
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(is_super_admin, FALSE) 
  FROM public.profiles 
  WHERE id = user_uuid;
$$;

CREATE OR REPLACE FUNCTION public.get_system_setting(key_name TEXT)
RETURNS TEXT
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT setting_value 
  FROM public.system_settings 
  WHERE setting_key = key_name;
$$;

CREATE OR REPLACE FUNCTION public.sync_account_subscription_status()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.accounts 
  SET subscription_status = NEW.status,
      trial_ends_at = NEW.trial_ends_at
  WHERE id = NEW.tenant_id;
  
  RETURN NEW;
END;
$$;

-- יצירה מחדש של הטריגרים
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER sync_subscription_status
    AFTER INSERT OR UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_account_subscription_status();