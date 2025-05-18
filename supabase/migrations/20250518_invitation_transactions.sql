
-- Create transaction function to handle invitation creation and account update
CREATE OR REPLACE FUNCTION public.create_invitation_and_update_account(
  p_email TEXT,
  p_account_id UUID,
  p_invitation_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Start transaction
  BEGIN
    -- Create the invitation
    INSERT INTO public.invitations (
      email,
      account_id,
      invitation_id
    ) VALUES (
      p_email,
      p_account_id,
      p_invitation_id
    );
    
    -- Update the account with the invitation details
    UPDATE public.accounts
    SET 
      invitation_id = p_invitation_id,
      shared_with_email = p_email
    WHERE id = p_account_id;
    
    -- Prepare result
    v_result = jsonb_build_object(
      'success', true,
      'invitation_id', p_invitation_id,
      'email', p_email,
      'account_id', p_account_id
    );
    
    RETURN v_result;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Transaction failed: %', SQLERRM;
  END;
END;
$$;

-- Create transaction function to handle invitation removal and account update
CREATE OR REPLACE FUNCTION public.remove_invitation_and_update_account(
  p_account_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation_id TEXT;
  v_result JSONB;
BEGIN
  -- Start transaction
  BEGIN
    -- Get the invitation ID from the account
    SELECT invitation_id INTO v_invitation_id
    FROM public.accounts
    WHERE id = p_account_id;
    
    -- If there's an invitation, mark it as cancelled in the invitations table
    IF v_invitation_id IS NOT NULL THEN
      UPDATE public.invitations
      SET accepted_at = 'infinity' -- Special value to mark as cancelled
      WHERE invitation_id = v_invitation_id
      AND accepted_at IS NULL;
    END IF;
    
    -- Update the account to remove sharing information
    UPDATE public.accounts
    SET 
      invitation_id = NULL,
      shared_with_email = NULL,
      shared_with_id = NULL
    WHERE id = p_account_id;
    
    -- Prepare result
    v_result = jsonb_build_object(
      'success', true,
      'account_id', p_account_id
    );
    
    RETURN v_result;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Transaction failed: %', SQLERRM;
  END;
END;
$$;

-- Create transaction function to handle invitation acceptance and account update
CREATE OR REPLACE FUNCTION public.accept_invitation_and_update_account(
  p_invitation_id TEXT,
  p_user_id UUID,
  p_user_email TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation RECORD;
  v_account_id UUID;
  v_owner_id UUID;
  v_result JSONB;
BEGIN
  -- Start transaction
  BEGIN
    -- Get the invitation with account data
    SELECT i.*, a.owner_id INTO v_invitation
    FROM public.invitations i
    JOIN public.accounts a ON i.account_id = a.id
    WHERE i.invitation_id = p_invitation_id
    AND i.accepted_at IS NULL
    AND i.expires_at > now();
    
    -- Check if invitation exists and is valid
    IF v_invitation IS NULL THEN
      RAISE EXCEPTION 'ההזמנה לא נמצאה או שפג תוקפה';
    END IF;
    
    -- Check if emails match (case-insensitive)
    IF LOWER(v_invitation.email) != LOWER(p_user_email) THEN
      RAISE EXCEPTION 'ההזמנה מיועדת ל-% אך אתה מחובר כ-%', v_invitation.email, p_user_email;
    END IF;
    
    -- Check if this account already belongs to the current user
    IF v_invitation.owner_id = p_user_id THEN
      RAISE EXCEPTION 'לא ניתן לשתף חשבון עם עצמך';
    END IF;
    
    -- Store values for use after updating
    v_account_id = v_invitation.account_id;
    v_owner_id = v_invitation.owner_id;
    
    -- Mark invitation as accepted
    UPDATE public.invitations
    SET accepted_at = now()
    WHERE invitation_id = p_invitation_id;
    
    -- Update the account with the user's information
    UPDATE public.accounts
    SET 
      shared_with_id = p_user_id,
      shared_with_email = p_user_email
    WHERE id = v_account_id;
    
    -- Prepare result
    v_result = jsonb_build_object(
      'success', true,
      'invitation_id', p_invitation_id,
      'account_id', v_account_id,
      'owner_id', v_owner_id
    );
    
    RETURN v_result;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION '%', SQLERRM;
  END;
END;
$$;

-- Create function to initialize the transaction functions (called by the edge function)
CREATE OR REPLACE FUNCTION public.create_invitation_transaction_function()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Functions are already created above
  RETURN true;
END;
$$;
