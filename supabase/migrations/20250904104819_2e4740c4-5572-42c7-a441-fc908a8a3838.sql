-- Create trigger to automatically normalize phone numbers when profiles are updated
CREATE OR REPLACE FUNCTION auto_normalize_phone_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If phone_number is being updated, also update phone_e164
  IF NEW.phone_number IS DISTINCT FROM OLD.phone_number AND NEW.phone_number IS NOT NULL THEN
    NEW.phone_e164 := normalize_il_phone(NEW.phone_number);
  END IF;
  
  -- If phone_e164 is being set directly, validate it
  IF NEW.phone_e164 IS DISTINCT FROM OLD.phone_e164 AND NEW.phone_e164 IS NOT NULL THEN
    -- Ensure phone_e164 is properly formatted
    IF NEW.phone_e164 !~ '^\+972[0-9]{9}$' THEN
      NEW.phone_e164 := normalize_il_phone(NEW.phone_e164);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_auto_normalize_phone ON profiles;
CREATE TRIGGER trigger_auto_normalize_phone
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_normalize_phone_number();