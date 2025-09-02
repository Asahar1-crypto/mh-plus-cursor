-- Add unique constraint on phone_number to prevent multiple users with same phone
-- Only non-null phone numbers should be unique (allow multiple null values)
CREATE UNIQUE INDEX idx_profiles_phone_number_unique 
ON public.profiles (phone_number) 
WHERE phone_number IS NOT NULL;