-- Add onboarding_completed to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add billing cycle fields to accounts table
ALTER TABLE public.accounts 
ADD COLUMN IF NOT EXISTS billing_cycle_start_day INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS billing_cycle_end_day INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS billing_cycle_type TEXT DEFAULT 'monthly';

-- Add check constraints for billing cycle
ALTER TABLE public.accounts
ADD CONSTRAINT billing_cycle_start_day_range 
CHECK (billing_cycle_start_day >= 1 AND billing_cycle_start_day <= 31);

ALTER TABLE public.accounts
ADD CONSTRAINT billing_cycle_end_day_range 
CHECK (billing_cycle_end_day IS NULL OR (billing_cycle_end_day >= 1 AND billing_cycle_end_day <= 31));

-- Add index for onboarding queries
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding 
ON public.profiles(onboarding_completed) 
WHERE onboarding_completed = FALSE;

COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Indicates if user has completed the initial onboarding flow';
COMMENT ON COLUMN public.accounts.billing_cycle_start_day IS 'Day of month when billing cycle starts (1-31)';
COMMENT ON COLUMN public.accounts.billing_cycle_end_day IS 'Day of month when billing cycle ends (NULL for end of month)';
COMMENT ON COLUMN public.accounts.billing_cycle_type IS 'Type of billing cycle: monthly (default) or custom';