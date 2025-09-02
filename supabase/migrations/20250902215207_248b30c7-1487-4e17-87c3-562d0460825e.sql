-- Make user_id nullable in sms_verification_codes table for registration flow
ALTER TABLE public.sms_verification_codes ALTER COLUMN user_id DROP NOT NULL;