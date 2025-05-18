
-- Create an RPC function that uses a transaction to safely create an account if it doesn't exist
CREATE OR REPLACE FUNCTION create_account_if_not_exists(
  user_id UUID,
  account_name TEXT
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  owner_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_account RECORD;
  new_account_id UUID;
BEGIN
  -- Begin transaction
  BEGIN
    -- First check if an account already exists for this user
    SELECT id, name, owner_id INTO existing_account
    FROM public.accounts
    WHERE owner_id = user_id
    LIMIT 1;
    
    -- If account exists, return it
    IF found THEN
      RETURN QUERY SELECT 
        existing_account.id,
        existing_account.name,
        existing_account.owner_id;
    ELSE
      -- Create new account if none exists
      INSERT INTO public.accounts (name, owner_id)
      VALUES (account_name, user_id)
      RETURNING id, name, owner_id INTO existing_account;
      
      -- Return the newly created account
      RETURN QUERY SELECT 
        existing_account.id,
        existing_account.name,
        existing_account.owner_id;
    END IF;
  END;
END;
$$;

-- Grant access to the authenticated role
GRANT EXECUTE ON FUNCTION create_account_if_not_exists(UUID, TEXT) TO authenticated;
