-- Fix critical security vulnerability: Add search_path to all functions
-- This prevents SQL injection attacks and ensures secure function execution

-- 1. Fix get_current_user_email function
CREATE OR REPLACE FUNCTION public.get_current_user_email()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public, auth
AS $function$
  SELECT email FROM auth.users WHERE id = auth.uid();
$function$;

-- 2. Fix get_user_account_ids function
CREATE OR REPLACE FUNCTION public.get_user_account_ids(user_uuid uuid)
 RETURNS uuid[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT ARRAY_AGG(account_id) 
  FROM public.account_members 
  WHERE user_id = user_uuid;
$function$;

-- 3. Fix is_account_admin function
CREATE OR REPLACE FUNCTION public.is_account_admin(user_uuid uuid, account_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.account_members 
    WHERE user_id = user_uuid 
    AND account_id = account_uuid 
    AND role = 'admin'
  );
$function$;

-- 4. Fix create_account_if_not_exists function
CREATE OR REPLACE FUNCTION public.create_account_if_not_exists(user_id uuid, account_name text)
 RETURNS TABLE(id uuid, name text, owner_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  existing_account RECORD;
  new_account_id UUID;
BEGIN
  -- Use a more robust check for existing accounts
  -- First check if user already owns any account
  SELECT a.id, a.name, a.owner_id INTO existing_account
  FROM public.accounts a
  WHERE a.owner_id = user_id
  ORDER BY a.created_at ASC
  LIMIT 1;
  
  -- If account exists, return it
  IF FOUND THEN
    RETURN QUERY SELECT 
      existing_account.id,
      existing_account.name,
      existing_account.owner_id;
    RETURN;
  END IF;
  
  -- If no account exists, create one with a transaction lock to prevent duplicates
  BEGIN
    -- Use advisory lock to prevent concurrent creation
    PERFORM pg_advisory_xact_lock(hashtext(user_id::text));
    
    -- Double-check after acquiring lock - explicitly qualify column names
    SELECT accounts.id, accounts.name, accounts.owner_id INTO existing_account
    FROM public.accounts
    WHERE accounts.owner_id = user_id
    LIMIT 1;
    
    IF FOUND THEN
      RETURN QUERY SELECT 
        existing_account.id,
        existing_account.name,
        existing_account.owner_id;
      RETURN;
    END IF;
    
    -- Create new account - explicitly specify columns
    INSERT INTO public.accounts (name, owner_id)
    VALUES (account_name, user_id)
    RETURNING accounts.id, accounts.name, accounts.owner_id INTO existing_account;
    
    -- Return the newly created account
    RETURN QUERY SELECT 
      existing_account.id,
      existing_account.name,
      existing_account.owner_id;
  END;
END;
$function$;

-- 5. Fix is_account_member function
CREATE OR REPLACE FUNCTION public.is_account_member(user_uuid uuid, account_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.account_members 
    WHERE user_id = user_uuid 
    AND account_id = account_uuid
  );
$function$;

-- 6. Fix add_account_member function
CREATE OR REPLACE FUNCTION public.add_account_member(account_uuid uuid, user_uuid uuid, member_role account_member_role DEFAULT 'member'::account_member_role)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth
AS $function$
BEGIN
  -- Check if the current user is an admin of the account
  IF NOT public.is_account_admin(auth.uid(), account_uuid) THEN
    RAISE EXCEPTION 'Only account admins can add members';
  END IF;
  
  -- Add the member
  INSERT INTO public.account_members (account_id, user_id, role)
  VALUES (account_uuid, user_uuid, member_role)
  ON CONFLICT (account_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    updated_at = now();
    
  RETURN TRUE;
END;
$function$;

-- 7. Fix remove_account_member function
CREATE OR REPLACE FUNCTION public.remove_account_member(account_uuid uuid, user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth
AS $function$
BEGIN
  -- Check if the current user is an admin of the account
  IF NOT public.is_account_admin(auth.uid(), account_uuid) THEN
    RAISE EXCEPTION 'Only account admins can remove members';
  END IF;
  
  -- Don't allow removing the last admin
  IF (
    SELECT role FROM public.account_members 
    WHERE account_id = account_uuid AND user_id = user_uuid
  ) = 'admin' THEN
    IF (
      SELECT COUNT(*) FROM public.account_members 
      WHERE account_id = account_uuid AND role = 'admin'
    ) <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last admin from an account';
    END IF;
  END IF;
  
  -- Remove the member
  DELETE FROM public.account_members 
  WHERE account_id = account_uuid AND user_id = user_uuid;
    
  RETURN TRUE;
END;
$function$;

-- 8. Fix get_account_members_with_details function
CREATE OR REPLACE FUNCTION public.get_account_members_with_details(account_uuid uuid)
 RETURNS TABLE(user_id uuid, user_name text, role account_member_role, joined_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth
AS $function$
BEGIN
  -- Check if the current user is a member of the account
  IF NOT public.is_account_member(auth.uid(), account_uuid) THEN
    RAISE EXCEPTION 'Access denied: Not a member of this account';
  END IF;
  
  RETURN QUERY
  SELECT 
    am.user_id,
    p.name as user_name,
    am.role,
    am.joined_at
  FROM public.account_members am
  JOIN public.profiles p ON p.id = am.user_id
  WHERE am.account_id = account_uuid
  ORDER BY am.role DESC, am.joined_at ASC;
END;
$function$;

-- 9. Fix accept_invitation_and_add_member function
CREATE OR REPLACE FUNCTION public.accept_invitation_and_add_member(invitation_uuid text, user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth
AS $function$
DECLARE
  invitation_record record;
  account_uuid uuid;
  user_email text;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO user_email FROM auth.users WHERE id = user_uuid;
  
  IF user_email IS NULL THEN
    RAISE EXCEPTION 'User not found: %', user_uuid;
  END IF;
  
  -- Get invitation details and validate
  SELECT account_id, email, accepted_at, expires_at 
  INTO invitation_record
  FROM public.invitations 
  WHERE invitation_id = invitation_uuid 
  AND accepted_at IS NULL 
  AND expires_at > now();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or expired for invitation_id: %', invitation_uuid;
  END IF;
  
  account_uuid := invitation_record.account_id;
  
  -- Verify that the user's email matches the invitation email (case insensitive)
  IF LOWER(user_email) != LOWER(invitation_record.email) THEN
    RAISE EXCEPTION 'User email (%) does not match invitation email (%)', user_email, invitation_record.email;
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM public.account_members 
    WHERE account_id = account_uuid AND user_id = user_uuid
  ) THEN
    -- User is already a member, just mark invitation as accepted
    UPDATE public.invitations 
    SET accepted_at = now() 
    WHERE invitation_id = invitation_uuid;
    
    RAISE NOTICE 'User % is already a member of account %, invitation marked as accepted', user_uuid, account_uuid;
    RETURN TRUE;
  END IF;
  
  -- Add the member without admin check (this is the key difference)
  INSERT INTO public.account_members (account_id, user_id, role)
  VALUES (account_uuid, user_uuid, 'member');
  
  -- Mark invitation as accepted
  UPDATE public.invitations 
  SET accepted_at = now() 
  WHERE invitation_id = invitation_uuid;
  
  RAISE NOTICE 'Successfully added user % as member to account % and marked invitation as accepted', user_uuid, account_uuid;
  RETURN TRUE;
END;
$function$;

-- 10. Fix create_account_with_admin function
CREATE OR REPLACE FUNCTION public.create_account_with_admin(account_name text, admin_user_id uuid)
 RETURNS TABLE(id uuid, name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
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

-- 11. Fix update_modified_column function
CREATE OR REPLACE FUNCTION public.update_modified_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- 12. Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  RETURN new;
END;
$function$;