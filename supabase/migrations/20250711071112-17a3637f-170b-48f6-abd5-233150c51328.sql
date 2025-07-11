-- ========== MIGRATION TO NEW ARCHITECTURE ==========
-- This migration transforms the current owner-based model to a member-based model
-- where accounts are independent entities with users as members

-- Step 1: Create account_members table
CREATE TABLE public.account_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(account_id, user_id)
);

-- Step 2: Create role enum for better type safety
CREATE TYPE public.account_member_role AS ENUM ('admin', 'member');

-- Step 3: Update account_members table to use the enum
ALTER TABLE public.account_members 
ALTER COLUMN role TYPE account_member_role USING role::account_member_role;

-- Step 4: Migrate existing account owners to account_members
INSERT INTO public.account_members (account_id, user_id, role)
SELECT 
  a.id as account_id,
  a.owner_id as user_id,
  'admin'::account_member_role as role
FROM public.accounts a
WHERE a.owner_id IS NOT NULL
ON CONFLICT (account_id, user_id) DO NOTHING;

-- Step 5: Migrate existing shared accounts to account_members
INSERT INTO public.account_members (account_id, user_id, role)
SELECT 
  a.id as account_id,
  a.shared_with_id as user_id,
  'member'::account_member_role as role
FROM public.accounts a
WHERE a.shared_with_id IS NOT NULL
ON CONFLICT (account_id, user_id) DO NOTHING;

-- Step 6: Create security definer functions to avoid RLS recursion issues
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

-- Step 7: Enable RLS on account_members
ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies for account_members
CREATE POLICY "Users can view their own memberships" 
ON public.account_members 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Account admins can manage memberships" 
ON public.account_members 
FOR ALL 
USING (public.is_account_admin(auth.uid(), account_id));

-- Step 9: Update accounts table RLS policies
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
WITH CHECK (true); -- We'll handle admin assignment in application logic

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

-- Step 10: Update children table RLS policies
DROP POLICY IF EXISTS "Users can modify children in accounts they own" ON public.children;
DROP POLICY IF EXISTS "Users can view children in their accounts" ON public.children;

CREATE POLICY "Account members can view children" 
ON public.children 
FOR SELECT 
USING (account_id = ANY(public.get_user_account_ids(auth.uid())));

CREATE POLICY "Account admins can manage children" 
ON public.children 
FOR ALL 
USING (public.is_account_admin(auth.uid(), account_id));

CREATE POLICY "Account members can create children" 
ON public.children 
FOR INSERT 
WITH CHECK (public.is_account_member(auth.uid(), account_id));

-- Step 11: Update expenses table RLS policies
DROP POLICY IF EXISTS "Users can create expenses in their accounts" ON public.expenses;
DROP POLICY IF EXISTS "Users can update their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can view expenses in their accounts" ON public.expenses;

CREATE POLICY "Account members can view expenses" 
ON public.expenses 
FOR SELECT 
USING (account_id = ANY(public.get_user_account_ids(auth.uid())));

CREATE POLICY "Account members can create expenses" 
ON public.expenses 
FOR INSERT 
WITH CHECK (
  public.is_account_member(auth.uid(), account_id) 
  AND paid_by_id = auth.uid()
);

CREATE POLICY "Expense creators and account admins can update expenses" 
ON public.expenses 
FOR UPDATE 
USING (
  paid_by_id = auth.uid() 
  OR public.is_account_admin(auth.uid(), account_id)
);

-- Step 12: Update invitations table RLS policies
DROP POLICY IF EXISTS "Account owners can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Account owners can view invitations for their accounts" ON public.invitations;
DROP POLICY IF EXISTS "Account owners can delete invitations" ON public.invitations;

CREATE POLICY "Account admins can manage invitations" 
ON public.invitations 
FOR ALL 
USING (public.is_account_admin(auth.uid(), account_id));

-- Step 13: Add triggers for updated_at
CREATE TRIGGER update_account_members_updated_at
BEFORE UPDATE ON public.account_members
FOR EACH ROW
EXECUTE FUNCTION public.update_modified_column();

-- Step 14: Remove old columns from accounts table (after migration)
-- We'll keep owner_id and shared_with_id for now and remove them in application logic
-- ALTER TABLE public.accounts DROP COLUMN IF EXISTS owner_id;
-- ALTER TABLE public.accounts DROP COLUMN IF EXISTS shared_with_id;
-- ALTER TABLE public.accounts DROP COLUMN IF EXISTS shared_with_email;

-- Step 15: Create function to add user as admin when creating account
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