-- Set default billing_cycle_start_day to 1 for all accounts
UPDATE public.accounts 
SET billing_cycle_start_day = 1 
WHERE billing_cycle_start_day IS NULL;

-- Ensure future accounts have default value
ALTER TABLE public.accounts 
ALTER COLUMN billing_cycle_start_day SET DEFAULT 1;