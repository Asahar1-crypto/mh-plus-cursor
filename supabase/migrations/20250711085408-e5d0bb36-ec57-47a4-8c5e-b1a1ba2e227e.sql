-- Add new columns for recurring expense end date functionality
ALTER TABLE public.expenses 
ADD COLUMN has_end_date BOOLEAN DEFAULT FALSE,
ADD COLUMN end_date DATE;