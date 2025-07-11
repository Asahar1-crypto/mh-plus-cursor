-- ========== MIGRATION TO NEW ARCHITECTURE (FIXED) ==========
-- This migration transforms the current owner-based model to a member-based model
-- where accounts are independent entities with users as members

-- Step 1: Create role enum first
CREATE TYPE public.account_member_role AS ENUM ('admin', 'member');

-- Step 2: Create account_members table with correct enum type
CREATE TABLE public.account_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role account_member_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(account_id, user_id)
);

-- Step 3: Migrate existing account owners to account_members
INSERT INTO public.account_members (account_id, user_id, role)
SELECT 
  a.id as account_id,
  a.owner_id as user_id,
  'admin'::account_member_role as role
FROM public.accounts a
WHERE a.owner_id IS NOT NULL
ON CONFLICT (account_id, user_id) DO NOTHING;

-- Step 4: Migrate existing shared accounts to account_members
INSERT INTO public.account_members (account_id, user_id, role)
SELECT 
  a.id as account_id,
  a.shared_with_id as user_id,
  'member'::account_member_role as role
FROM public.accounts a
WHERE a.shared_with_id IS NOT NULL
ON CONFLICT (account_id, user_id) DO NOTHING;

-- Step 5: Create security definer functions to avoid RLS recursion issues
CREATE OR REPLACE FUNCTION public.get_user_account_ids(user_uuid UUID)
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(account_id) 
  FROM public.account_members 
  WHERE user_id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_account_admin(user_uuid UUID, account_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.account_members 
    WHERE user_id = user_uuid 
    AND account_id = account_uuid 
    AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_account_member(user_uuid UUID, account_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.account_members 
    WHERE user_id = user_uuid 
    AND account_id = account_uuid
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Step 6: Enable RLS on account_members
ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for account_members
CREATE POLICY "Users can view their own memberships" 
ON public.account_members 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Account admins can manage memberships" 
ON public.account_members 
FOR ALL 
USING (public.is_account_admin(auth.uid(), account_id));

-- Step 8: Update accounts table RLS policies
DROP POLICY IF EXISTS "Users can view accounts they are part of" ON public.accounts;
DROP POLICY IF EXISTS "Users can view accounts they are invited to" ON public.accounts;
DROP POLICY IF EXISTS "Users can update accounts they own" ON public.accounts;
DROP POLICY IF EXISTS "Users can create accounts" ON public.accounts;

-- New policies based on membership
CREATE POLICY "Members can view their accounts" 
ON public.accounts 
FOR SELECT 
USING (id = ANY(public.get_user_account_ids(auth.uid())));

CREATE POLICY "Admins can update their accounts" 
ON public.accounts 
FOR UPDATE 
USING (public.is_account_admin(auth.uid(), id));

CREATE POLICY "Users can create accounts" 
ON public.accounts 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view accounts they are invited to" 
ON public.accounts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.invitations
    WHERE invitations.account_id = accounts.id 
    AND invitations.email = public.get_current_user_email()
    AND invitations.accepted_at IS NULL
    AND invitations.expires_at > now()
  )
);

-- Step 9: Add triggers for updated_at
CREATE TRIGGER update_account_members_updated_at
BEFORE UPDATE ON public.account_members
FOR EACH ROW
EXECUTE FUNCTION public.update_modified_column();

-- Step 10: Create function to add user as admin when creating account
CREATE OR REPLACE FUNCTION public.create_account_with_admin(
  account_name TEXT,
  admin_user_id UUID
)
RETURNS TABLE(id UUID, name TEXT) AS $$
DECLARE
  new_account_id UUID;
BEGIN
  -- Create the account
  INSERT INTO public.accounts (name)
  VALUES (account_name)
  RETURNING accounts.id, accounts.name INTO new_account_id, account_name;
  
  -- Add the creator as admin
  INSERT INTO public.account_members (account_id, user_id, role)
  VALUES (new_account_id, admin_user_id, 'admin');
  
  -- Return the account info
  RETURN QUERY SELECT new_account_id, account_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;