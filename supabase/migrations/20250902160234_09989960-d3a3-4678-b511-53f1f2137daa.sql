-- Create a table to track deleted users
CREATE TABLE public.deleted_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_user_id UUID NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  deleted_by UUID NOT NULL REFERENCES public.profiles(id),
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accounts_deleted TEXT[], -- Array of account names that were deleted
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deleted_users ENABLE ROW LEVEL SECURITY;

-- Only super admins can view deleted users
CREATE POLICY "Only super admins can view deleted users" 
ON public.deleted_users 
FOR SELECT 
USING (is_super_admin(auth.uid()));

-- Only super admins can create records (through delete-user function)
CREATE POLICY "Only super admins can create deleted user records" 
ON public.deleted_users 
FOR INSERT 
WITH CHECK (is_super_admin(auth.uid()));

-- Add comment for documentation
COMMENT ON TABLE public.deleted_users IS 'Tracks users that have been permanently deleted by super admins';