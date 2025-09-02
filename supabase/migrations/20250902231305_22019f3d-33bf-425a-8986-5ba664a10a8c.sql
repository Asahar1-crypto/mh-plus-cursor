-- Add verification_type column to support both registration and login OTP
ALTER TABLE public.sms_verification_codes 
ADD COLUMN verification_type TEXT DEFAULT 'registration';

-- Add constraint to ensure only valid verification types
ALTER TABLE public.sms_verification_codes 
ADD CONSTRAINT check_verification_type 
CHECK (verification_type IN ('registration', 'login'));

-- Create index for better performance on phone login queries
CREATE INDEX idx_sms_verification_phone_type_verified 
ON public.sms_verification_codes (phone_number, verification_type, verified, expires_at);