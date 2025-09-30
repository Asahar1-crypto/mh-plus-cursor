-- Fix create_account_with_admin to explicitly set trial period
CREATE OR REPLACE FUNCTION public.create_account_with_admin(account_name text, admin_user_id uuid)
 RETURNS TABLE(id uuid, name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_account_id UUID;
BEGIN
  -- Create the account with owner_id, trial status and trial end date
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
    now() + interval '14 days'
  )
  RETURNING accounts.id, accounts.name INTO new_account_id, account_name;
  
  -- Add the creator as admin member
  INSERT INTO public.account_members (account_id, user_id, role)
  VALUES (new_account_id, admin_user_id, 'admin');
  
  -- Return the account info
  RETURN QUERY SELECT new_account_id, account_name;
END;
$function$;