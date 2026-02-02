-- Step 1: Add phone_number column to invitations table
ALTER TABLE public.invitations ADD COLUMN phone_number TEXT;

-- Step 2: Make email nullable (since we're moving to phone-based invitations)
ALTER TABLE public.invitations ALTER COLUMN email DROP NOT NULL;

-- Step 3: Create a function to get user's phone number
CREATE OR REPLACE FUNCTION public.get_current_user_phone()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT phone_e164 FROM public.profiles WHERE id = auth.uid();
$$;

-- Step 4: Add policy for users to view invitations sent to their phone
CREATE POLICY "Users can view invitations sent to their phone"
ON public.invitations
FOR SELECT
USING (
  phone_number IS NOT NULL 
  AND phone_number = get_current_user_phone() 
  AND accepted_at IS NULL 
  AND expires_at > now()
);

-- Step 5: Add policy for users to update invitations sent to their phone
CREATE POLICY "Users can update invitations sent to their phone"
ON public.invitations
FOR UPDATE
USING (
  phone_number IS NOT NULL 
  AND phone_number = get_current_user_phone() 
  AND accepted_at IS NULL 
  AND expires_at > now()
)
WITH CHECK (
  phone_number = get_current_user_phone()
);