-- Enable RLS on password_reset_attempts table
ALTER TABLE public.password_reset_attempts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for password_reset_attempts table
-- Only super admins can view all attempts for security auditing
CREATE POLICY "Super admins can view all password reset attempts"
ON public.password_reset_attempts
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- No direct insert/update/delete policies - only through functions