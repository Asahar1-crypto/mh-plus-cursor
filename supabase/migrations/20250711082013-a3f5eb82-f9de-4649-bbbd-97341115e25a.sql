-- Add created_by_id field to expenses table to separate who created the expense from who needs to pay
ALTER TABLE public.expenses 
ADD COLUMN created_by_id UUID REFERENCES public.profiles(id);

-- Update existing expenses to set created_by_id to paid_by_id for backward compatibility
UPDATE public.expenses 
SET created_by_id = paid_by_id 
WHERE created_by_id IS NULL;