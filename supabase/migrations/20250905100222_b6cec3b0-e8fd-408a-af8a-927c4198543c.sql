-- Update invitation expiry time from 7 days to 48 hours
ALTER TABLE public.invitations 
ALTER COLUMN expires_at SET DEFAULT (now() + '48 hours'::interval);