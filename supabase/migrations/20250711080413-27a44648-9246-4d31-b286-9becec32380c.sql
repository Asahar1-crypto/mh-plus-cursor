-- Fix the create_account_with_admin function to include owner_id
CREATE OR REPLACE FUNCTION public.create_account_with_admin(account_name text, admin_user_id uuid)
 RETURNS TABLE(id uuid, name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  new_account_id UUID;
BEGIN
  -- Create the account with owner_id set to the admin user
  INSERT INTO public.accounts (name, owner_id)
  VALUES (account_name, admin_user_id)
  RETURNING accounts.id, accounts.name INTO new_account_id, account_name;
  
  -- Add the creator as admin member
  INSERT INTO public.account_members (account_id, user_id, role)
  VALUES (new_account_id, admin_user_id, 'admin');
  
  -- Return the account info
  RETURN QUERY SELECT new_account_id, account_name;
END;
$function$;