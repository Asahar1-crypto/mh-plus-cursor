-- Update the user's profile with the verified phone number
UPDATE public.profiles 
SET phone_number = '+972543720999', phone_verified = true
WHERE id = '681c4853-3080-42cf-b1e4-3a89d4bdaeff';

-- Update the SMS verification code with the user_id
UPDATE public.sms_verification_codes 
SET user_id = '681c4853-3080-42cf-b1e4-3a89d4bdaeff'
WHERE phone_number = '+972543720999' 
AND verification_type = 'registration' 
AND verified = true 
AND user_id IS NULL
AND created_at >= '2025-09-04 09:53:00';