-- Add field to track if recurring expense should auto-approve future generated expenses
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS recurring_auto_approved boolean DEFAULT false;

-- Add field to track who approved the recurring series
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS recurring_approved_by uuid REFERENCES public.profiles(id);

-- Add comment for clarity
COMMENT ON COLUMN public.expenses.recurring_auto_approved IS 'When true, future generated expenses from this recurring template will be auto-approved';
COMMENT ON COLUMN public.expenses.recurring_approved_by IS 'The user who approved all future recurring expenses';