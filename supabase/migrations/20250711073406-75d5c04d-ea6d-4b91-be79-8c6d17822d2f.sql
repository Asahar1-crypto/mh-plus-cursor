-- Create a special function for accepting invitations that bypasses admin check
CREATE OR REPLACE FUNCTION public.accept_invitation_and_add_member(invitation_uuid text, user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  invitation_record record;
  account_uuid uuid;
BEGIN
  -- Get invitation details and validate
  SELECT account_id, email, accepted_at, expires_at 
  INTO invitation_record
  FROM public.invitations 
  WHERE invitation_id = invitation_uuid 
  AND accepted_at IS NULL 
  AND expires_at > now();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or expired';
  END IF;
  
  account_uuid := invitation_record.account_id;
  
  -- Verify that the user's email matches the invitation email
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = user_uuid 
    AND email = invitation_record.email
  ) THEN
    RAISE EXCEPTION 'User email does not match invitation email';
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
  
  -- Add the member without admin check (this is the key difference)
  INSERT INTO public.account_members (account_id, user_id, role)
  VALUES (account_uuid, user_uuid, 'member');
  
  -- Mark invitation as accepted
  UPDATE public.invitations 
  SET accepted_at = now() 
  WHERE invitation_id = invitation_uuid;
    
  RETURN TRUE;
END;
$function$