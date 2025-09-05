-- Update check constraint to allow family_registration verification type
ALTER TABLE sms_verification_codes 
DROP CONSTRAINT IF EXISTS check_verification_type;

ALTER TABLE sms_verification_codes 
ADD CONSTRAINT check_verification_type 
CHECK (verification_type IN ('login', 'registration', 'family_registration'));