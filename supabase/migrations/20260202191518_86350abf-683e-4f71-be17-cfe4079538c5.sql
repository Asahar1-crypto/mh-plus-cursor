-- Drop the old function first
DROP FUNCTION IF EXISTS public.get_public_invitation_details(text);

-- Create with new signature including phone_number
CREATE FUNCTION public.get_public_invitation_details(p_invitation_id text)
RETURNS TABLE(
  account_id uuid, 
  expires_at timestamp with time zone, 
  accepted_at timestamp with time zone, 
  account_name text, 
  owner_name text,
  email text,
  phone_number text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    i.account_id,
    i.expires_at,
    i.accepted_at,
    a.name as account_name,
    p.name as owner_name,
    i.email,
    i.phone_number
  FROM invitations i
  JOIN accounts a ON a.id = i.account_id
  JOIN profiles p ON p.id = a.owner_id
  WHERE i.invitation_id = p_invitation_id
    AND i.expires_at > now()
    AND i.accepted_at IS NULL;
$$;

-- Update accept_invitation_and_add_member to work with phone-based invitations
CREATE OR REPLACE FUNCTION public.accept_invitation_and_add_member(invitation_uuid text, user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  invitation_record record;
  account_uuid uuid;
  user_email text;
  user_phone text;
BEGIN
  -- Get user email and phone from auth.users and profiles
  SELECT email INTO user_email FROM auth.users WHERE id = user_uuid;
  SELECT phone_e164 INTO user_phone FROM public.profiles WHERE id = user_uuid;
  
  IF user_email IS NULL AND user_phone IS NULL THEN
    RAISE EXCEPTION 'User not found: %', user_uuid;
  END IF;
  
  -- Get invitation details and validate
  SELECT account_id, email, phone_number, accepted_at, expires_at 
  INTO invitation_record
  FROM public.invitations 
  WHERE invitation_id = invitation_uuid 
  AND accepted_at IS NULL 
  AND expires_at > now();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or expired for invitation_id: %', invitation_uuid;
  END IF;
  
  account_uuid := invitation_record.account_id;
  
  -- Verify that the user's email OR phone matches the invitation
  IF invitation_record.phone_number IS NOT NULL THEN
    -- Phone-based invitation - match by phone
    IF user_phone IS NULL OR user_phone != invitation_record.phone_number THEN
      RAISE EXCEPTION 'User phone does not match invitation phone';
    END IF;
  ELSIF invitation_record.email IS NOT NULL THEN
    -- Email-based invitation - match by email
    IF user_email IS NULL OR LOWER(user_email) != LOWER(invitation_record.email) THEN
      RAISE EXCEPTION 'User email does not match invitation email';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invitation has no contact info';
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
    
    RETURN TRUE;
  END IF;
  
  -- Add the member
  INSERT INTO public.account_members (account_id, user_id, role)
  VALUES (account_uuid, user_uuid, 'member');
  
  -- Mark invitation as accepted
  UPDATE public.invitations 
  SET accepted_at = now() 
  WHERE invitation_id = invitation_uuid;
  
  RETURN TRUE;
END;
$$;