-- Extend budgets table: support recurring budgets, multi-category, end date
-- 1. Add new columns
ALTER TABLE public.budgets 
  ADD COLUMN IF NOT EXISTS budget_type TEXT DEFAULT 'monthly' CHECK (budget_type IN ('monthly', 'recurring')),
  ADD COLUMN IF NOT EXISTS categories TEXT[],
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

-- 2. Ensure existing rows have budget_type
UPDATE public.budgets SET budget_type = 'monthly' WHERE budget_type IS NULL;

-- 3. Drop old unique constraint (was: account_id, category, month, year)
-- PostgreSQL uses tablename_colnames_key for inline UNIQUE
ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS budgets_account_id_category_month_year_key;

-- 4. Make month/year nullable for recurring budgets
ALTER TABLE public.budgets 
  ALTER COLUMN month DROP NOT NULL,
  ALTER COLUMN year DROP NOT NULL;

-- 5. Make category nullable when using categories array
ALTER TABLE public.budgets ALTER COLUMN category DROP NOT NULL;

-- 6. Add partial unique for monthly budgets (single category)
CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_monthly_unique 
ON public.budgets (account_id, month, year, category) 
WHERE budget_type = 'monthly' AND category IS NOT NULL AND categories IS NULL;

-- Multi-category monthly budgets: no DB unique constraint, app prevents duplicates
