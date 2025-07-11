-- Add approved_by and approved_at columns to expenses table
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Add foreign key constraint for approved_by
ALTER TABLE public.expenses 
ADD CONSTRAINT fk_expenses_approved_by 
FOREIGN KEY (approved_by) REFERENCES auth.users(id);