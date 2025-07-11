-- Drop the existing check constraint
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_status_check;

-- Add the correct check constraint with all valid status values
ALTER TABLE public.expenses ADD CONSTRAINT expenses_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'paid'));