-- Add budget_limit column to children table
ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS budget_limit numeric(10,2) DEFAULT NULL;
