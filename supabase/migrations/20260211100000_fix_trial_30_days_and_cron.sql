-- =============================================================
-- Migration: Fix trial period to 30 days + add cron for expiry
-- =============================================================

-- 1. Update system_settings default trial_days from 14 to 30
UPDATE public.system_settings 
SET setting_value = '30'
WHERE setting_key = 'trial_days';

-- 2. Update the default on accounts table for trial_ends_at
ALTER TABLE public.accounts 
ALTER COLUMN trial_ends_at SET DEFAULT (now() + INTERVAL '30 days');

-- 3. Update create_account_with_admin to read trial_days from system_settings
CREATE OR REPLACE FUNCTION public.create_account_with_admin(account_name text, admin_user_id uuid)
 RETURNS TABLE(id uuid, name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_account_id UUID;
  v_trial_days INTEGER;
BEGIN
  -- Read trial days from system_settings (default 30 if not set)
  SELECT COALESCE(setting_value::integer, 30)
  INTO v_trial_days
  FROM public.system_settings
  WHERE setting_key = 'trial_days';

  -- Fallback if no row found
  IF v_trial_days IS NULL THEN
    v_trial_days := 30;
  END IF;

  -- Create the account with owner_id, trial status and dynamic trial end date
  INSERT INTO public.accounts (
    name, 
    owner_id,
    subscription_status,
    trial_ends_at
  )
  VALUES (
    account_name, 
    admin_user_id,
    'trial',
    now() + (v_trial_days || ' days')::interval
  )
  RETURNING accounts.id, accounts.name INTO new_account_id, account_name;
  
  -- Add the creator as admin member
  INSERT INTO public.account_members (account_id, user_id, role)
  VALUES (new_account_id, admin_user_id, 'admin');
  
  -- Return the account info
  RETURN QUERY SELECT new_account_id, account_name;
END;
$function$;

-- 4. Schedule cron job to expire trials every hour
SELECT cron.schedule(
  'expire-trials',
  '0 * * * *',
  $$SELECT public.update_expired_trials()$$
);

-- 5. Also run it once now to catch any already-expired trials
SELECT public.update_expired_trials();
