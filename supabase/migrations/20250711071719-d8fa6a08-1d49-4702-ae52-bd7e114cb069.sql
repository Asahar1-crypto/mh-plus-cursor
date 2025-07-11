-- ========== PHASE 2: UPDATE REMAINING TABLES ==========

-- Step 1: Update children table RLS policies
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

-- Step 2: Update expenses table RLS policies
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

-- Step 3: Update expense_children table RLS policies
DROP POLICY IF EXISTS "Users can create expense_children relationships" ON public.expense_children;
DROP POLICY IF EXISTS "Users can view expense_children relationships for their account" ON public.expense_children;

CREATE POLICY "Account members can view expense_children relationships" 
ON public.expense_children 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM expenses 
    WHERE expenses.id = expense_children.expense_id 
    AND expenses.account_id = ANY(public.get_user_account_ids(auth.uid()))
  )
);

CREATE POLICY "Account members can create expense_children relationships" 
ON public.expense_children 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM expenses 
    WHERE expenses.id = expense_children.expense_id 
    AND public.is_account_member(auth.uid(), expenses.account_id)
  )
);

-- Step 4: Update invitations table RLS policies
DROP POLICY IF EXISTS "Account owners can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Account owners can view invitations for their accounts" ON public.invitations;
DROP POLICY IF EXISTS "Account owners can delete invitations" ON public.invitations;

CREATE POLICY "Account admins can manage invitations" 
ON public.invitations 
FOR ALL 
USING (public.is_account_admin(auth.uid(), account_id));

-- Step 5: Create helper functions for account management
CREATE OR REPLACE FUNCTION public.add_account_member(
  account_uuid UUID,
  user_uuid UUID,
  member_role account_member_role DEFAULT 'member'
)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.remove_account_member(
  account_uuid UUID,
  user_uuid UUID
)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create function to get account members with details
CREATE OR REPLACE FUNCTION public.get_account_members_with_details(account_uuid UUID)
RETURNS TABLE(
  user_id UUID,
  user_name TEXT,
  role account_member_role,
  joined_at TIMESTAMP WITH TIME ZONE
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;