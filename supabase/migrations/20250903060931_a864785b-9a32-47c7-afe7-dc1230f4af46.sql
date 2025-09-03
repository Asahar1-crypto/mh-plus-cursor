-- Add phone_e164 column to profiles table for normalized phone storage
ALTER TABLE public.profiles 
ADD COLUMN phone_e164 text UNIQUE;

-- Add phone_type column to categorize phone numbers
ALTER TABLE public.profiles 
ADD COLUMN phone_type text CHECK (phone_type IN ('mobile', 'fixed', 'voip', 'special'));

-- Add extension column for phone extensions
ALTER TABLE public.profiles 
ADD COLUMN phone_extension text;

-- Add raw_phone_input column to store original input for debugging
ALTER TABLE public.profiles 
ADD COLUMN raw_phone_input text;

-- Create index on phone_e164 for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_e164 ON public.profiles(phone_e164);

-- Add comment to explain the phone_e164 format
COMMENT ON COLUMN public.profiles.phone_e164 IS 'Phone number in E.164 format (e.g., +972541234567)';
COMMENT ON COLUMN public.profiles.phone_type IS 'Type of phone number: mobile, fixed, voip, or special';
COMMENT ON COLUMN public.profiles.phone_extension IS 'Phone extension if applicable';
COMMENT ON COLUMN public.profiles.raw_phone_input IS 'Original phone input for debugging purposes';