-- Update the function to handle email verification more robustly
CREATE OR REPLACE FUNCTION public.accept_invitation_and_add_member(invitation_uuid text, user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
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
$function$