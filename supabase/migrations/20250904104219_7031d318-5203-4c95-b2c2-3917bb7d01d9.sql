-- Update existing profiles to have normalized phone_e164 field
-- This will sync all existing phone numbers to the E.164 format

-- Create a function to normalize Israeli phone numbers
CREATE OR REPLACE FUNCTION normalize_il_phone(phone_text text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  cleaned text;
  result text;
BEGIN
  -- Return NULL if input is NULL or empty
  IF phone_text IS NULL OR trim(phone_text) = '' THEN
    RETURN NULL;
  END IF;
  
  -- Clean the phone number - remove all non-digits except +
  cleaned := regexp_replace(phone_text, '[^0-9+]', '', 'g');
  
  -- Handle different Israeli phone formats
  IF cleaned ~ '^\+972' THEN
    -- Already in international format with +972
    result := cleaned;
  ELSIF cleaned ~ '^972' THEN
    -- International format without +
    result := '+' || cleaned;
  ELSIF cleaned ~ '^0[0-9]{9}$' THEN
    -- Local format starting with 0 (10 digits total)
    result := '+972' || substring(cleaned from 2);
  ELSIF cleaned ~ '^[0-9]{9}$' THEN
    -- 9 digits without leading 0
    result := '+972' || cleaned;
  ELSE
    -- Invalid format
    RETURN NULL;
  END IF;
  
  -- Validate the result has the correct length for Israeli numbers
  IF length(result) = 13 AND result ~ '^\+972[0-9]{9}$' THEN
    RETURN result;
  ELSE
    RETURN NULL;
  END IF;
END;
$$;

-- Update all existing profiles with phone_number but no phone_e164
UPDATE profiles 
SET phone_e164 = normalize_il_phone(phone_number)
WHERE phone_number IS NOT NULL 
  AND (phone_e164 IS NULL OR phone_e164 = '');

-- Add index for better performance on phone lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_e164 ON profiles(phone_e164);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON profiles(phone_number);