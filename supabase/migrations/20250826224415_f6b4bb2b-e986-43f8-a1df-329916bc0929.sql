-- Allow account members to view names of other account members
CREATE POLICY "Account members can view other members names" 
ON profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM account_members am1, account_members am2
    WHERE am1.user_id = auth.uid() 
    AND am2.user_id = profiles.id
    AND am1.account_id = am2.account_id
  )
);