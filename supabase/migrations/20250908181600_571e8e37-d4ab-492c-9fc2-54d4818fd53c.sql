-- Create table for tracking password reset attempts
CREATE TABLE public.password_reset_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX idx_password_reset_attempts_email_time 
ON public.password_reset_attempts(email, attempted_at);

-- Create function to clean up old attempts (older than 30 minutes)
CREATE OR REPLACE FUNCTION public.cleanup_old_reset_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.password_reset_attempts 
  WHERE attempted_at < now() - INTERVAL '30 minutes';
END;
$$;

-- Create function to check reset attempt limit
CREATE OR REPLACE FUNCTION public.check_reset_attempt_limit(user_email TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  -- Clean up old attempts first
  PERFORM cleanup_old_reset_attempts();
  
  -- Count attempts in last 30 minutes
  SELECT COUNT(*) INTO attempt_count
  FROM public.password_reset_attempts
  WHERE email = user_email 
    AND attempted_at > now() - INTERVAL '30 minutes';
  
  -- Return true if under limit (3 attempts), false if at/over limit
  RETURN attempt_count < 3;
END;
$$;

-- Create function to log reset attempt
CREATE OR REPLACE FUNCTION public.log_reset_attempt(user_email TEXT, client_ip INET DEFAULT NULL, client_user_agent TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.password_reset_attempts (email, ip_address, user_agent)
  VALUES (user_email, client_ip, client_user_agent);
END;
$$;