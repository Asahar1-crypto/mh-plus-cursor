-- Add split_equally column to expenses table
ALTER TABLE public.expenses 
ADD COLUMN split_equally boolean NOT NULL DEFAULT false;