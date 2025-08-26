-- תיקון search_path לפונקציות קיימות שיצרתי
DROP FUNCTION IF EXISTS public.update_updated_at_column();
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

DROP FUNCTION IF EXISTS public.is_super_admin(UUID);
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

DROP FUNCTION IF EXISTS public.get_system_setting(TEXT);
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

DROP FUNCTION IF EXISTS public.sync_account_subscription_status();
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