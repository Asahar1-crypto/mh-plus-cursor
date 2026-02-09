-- Add family_role column to profiles table
-- Values: 'father', 'mother', 'other'
-- Existing users default to 'other'
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS family_role text DEFAULT 'other';

-- Add a check constraint to ensure valid values
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_family_role_check 
CHECK (family_role IN ('father', 'mother', 'other'));

COMMENT ON COLUMN public.profiles.family_role IS 'Family role of the user: father, mother, or other';
