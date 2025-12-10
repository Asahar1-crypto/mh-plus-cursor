-- Create a secure function to get invitation details without exposing email
CREATE OR REPLACE FUNCTION public.get_public_invitation_details(p_invitation_id text)
RETURNS TABLE(
  account_id uuid,
  expires_at timestamptz,
  accepted_at timestamptz,
  account_name text,
  owner_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    i.account_id,
    i.expires_at,
    i.accepted_at,
    a.name as account_name,
    p.name as owner_name
  FROM invitations i
  JOIN accounts a ON a.id = i.account_id
  JOIN profiles p ON p.id = a.owner_id
  WHERE i.invitation_id = p_invitation_id
    AND i.expires_at > now()
    AND i.accepted_at IS NULL;
$$;

-- Drop the problematic public policy that exposes all invitation emails
DROP POLICY IF EXISTS "Public can view invitation by invitation_id" ON invitations;